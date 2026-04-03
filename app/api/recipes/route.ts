import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Recipe from '@/models/Recipe';
import Product from '@/models/Product';

// Unit conversion helper function
function convertUnit(quantity: number, fromUnit: string, toUnit: string): number {
  // If units are the same, no conversion needed
  if (fromUnit === toUnit) {
    return quantity;
  }

  // Conversion table to base units (gram for weight, ml for volume)
  const toBaseUnit: { [key: string]: number } = {
    // Weight conversions (to gram)
    'gram': 1,
    'kg': 1000,
    
    // Volume conversions (to ml)
    'ml': 1,
    'liter': 1000,
    
    // No conversion for discrete units
    'pcs': 1,
    'box': 1,
    'pack': 1,
  };

  // Check if units are in the same category
  const weightUnits = ['gram', 'kg'];
  const volumeUnits = ['ml', 'liter'];
  const discreteUnits = ['pcs', 'box', 'pack'];

  const fromCategory = weightUnits.includes(fromUnit) ? 'weight' 
    : volumeUnits.includes(fromUnit) ? 'volume' 
    : 'discrete';
  
  const toCategory = weightUnits.includes(toUnit) ? 'weight' 
    : volumeUnits.includes(toUnit) ? 'volume' 
    : 'discrete';

  // Cannot convert between different categories
  if (fromCategory !== toCategory) {
    throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}`);
  }

  // Convert to base unit then to target unit
  const baseQuantity = quantity * toBaseUnit[fromUnit];
  const convertedQuantity = baseQuantity / toBaseUnit[toUnit];

  return convertedQuantity;
}

// GET all recipes
export async function GET() {
  try {
    await dbConnect();
    
    const recipes = await Recipe.find({ isActive: true })
      .populate('product', 'name sku price')
      .populate('ingredients.product', 'name sku unit cost')
      .sort({ createdAt: -1 });
    
    return NextResponse.json({ recipes }, { status: 200 });
  } catch (error: any) {
    console.error('Get recipes error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}

// POST create new recipe
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.product || !body.ingredients || body.ingredients.length === 0) {
      return NextResponse.json(
        { error: 'Product and ingredients are required' },
        { status: 400 }
      );
    }

    // Check if recipe already exists
    const existingRecipe = await Recipe.findOne({ product: body.product });
    if (existingRecipe) {
      // If recipe exists but is inactive (soft deleted), reactivate and update it
      if (!existingRecipe.isActive) {
        // Process ingredients with costs
        const processedIngredients = await Promise.all(
          body.ingredients.map(async (ing: any) => {
            const ingredientProduct = await Product.findById(ing.product);
            if (!ingredientProduct) {
              throw new Error(`Ingredient product ${ing.product} not found`);
            }
            
            // Convert ingredient quantity to product unit for cost calculation
            let qtyInProductUnit: number;
            try {
              qtyInProductUnit = convertUnit(ing.quantity, ing.unit, ingredientProduct.unit);
            } catch (error: any) {
              throw new Error(`Unit conversion error for ${ingredientProduct.name}: ${error.message}`);
            }
            
            // Calculate cost: product cost is per unit, so multiply by converted quantity
            const ingredientCost = ingredientProduct.cost * qtyInProductUnit;
            
            return {
              product: ing.product,
              productName: ingredientProduct.name,
              quantity: ing.quantity,
              unit: ing.unit,
              cost: ingredientCost,
            };
          })
        );

        // Calculate total cost
        const totalCost = processedIngredients.reduce((sum: number, ing: any) => sum + ing.cost, 0);
        const yieldFactor = body.yieldFactor || 1;
        const costPerPortion = totalCost / (body.portionSize * yieldFactor);

        // Get product details
        const product = await Product.findById(body.product);
        if (!product) {
          return NextResponse.json(
            { error: 'Product not found' },
            { status: 404 }
          );
        }

        // Update the inactive recipe
        const updatedRecipe = await Recipe.findByIdAndUpdate(
          existingRecipe._id,
          {
            productName: product.name,
            portionSize: body.portionSize,
            portionUnit: body.portionUnit,
            yieldFactor: body.yieldFactor || 1,
            prepTime: body.prepTime,
            cookTime: body.cookTime,
            instructions: body.instructions,
            ingredients: processedIngredients,
            totalCost,
            costPerPortion,
            isActive: true, // Reactivate the recipe
          },
          { new: true }
        )
          .populate('product', 'name sku price')
          .populate('ingredients.product', 'name sku unit cost');

        // Update product to mark it has recipe
        await Product.findByIdAndUpdate(body.product, {
          hasRecipe: true,
          cost: costPerPortion,
        });

        return NextResponse.json(
          { message: 'Recipe reactivated and updated successfully', recipe: updatedRecipe },
          { status: 201 }
        );
      } else {
        // Recipe exists and is active
        return NextResponse.json(
          { error: 'Recipe for this product already exists' },
          { status: 409 }
        );
      }
    }

    // Get product details
    const product = await Product.findById(body.product);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Process ingredients with costs
    const processedIngredients = await Promise.all(
      body.ingredients.map(async (ing: any) => {
        const ingredientProduct = await Product.findById(ing.product);
        if (!ingredientProduct) {
          throw new Error(`Ingredient product ${ing.product} not found`);
        }
        
        // Convert ingredient quantity to product unit for cost calculation
        let qtyInProductUnit: number;
        try {
          qtyInProductUnit = convertUnit(ing.quantity, ing.unit, ingredientProduct.unit);
        } catch (error: any) {
          throw new Error(`Unit conversion error for ${ingredientProduct.name}: ${error.message}`);
        }
        
        // Calculate cost: product cost is per unit, so multiply by converted quantity
        const ingredientCost = ingredientProduct.cost * qtyInProductUnit;
        
        return {
          product: ing.product,
          productName: ingredientProduct.name,
          quantity: ing.quantity,
          unit: ing.unit,
          cost: ingredientCost,
        };
      })
    );

    // Calculate total cost
    const totalCost = processedIngredients.reduce((sum: number, ing: any) => sum + ing.cost, 0);
    const yieldFactor = body.yieldFactor || 1;
    const costPerPortion = totalCost / (body.portionSize * yieldFactor);

    const recipe = await Recipe.create({
      product: body.product,
      productName: product.name,
      portionSize: body.portionSize,
      portionUnit: body.portionUnit,
      yieldFactor: body.yieldFactor || 1,
      prepTime: body.prepTime,
      cookTime: body.cookTime,
      ingredients: processedIngredients,
      totalCost,
      costPerPortion,
    });

    // Update product to mark it has recipe
    await Product.findByIdAndUpdate(body.product, {
      hasRecipe: true,
      cost: costPerPortion,
    });

    const populatedRecipe = await Recipe.findById(recipe._id)
      .populate('product', 'name sku price')
      .populate('ingredients.product', 'name sku unit cost');

    return NextResponse.json(
      { message: 'Recipe created successfully', recipe: populatedRecipe },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create recipe error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create recipe' },
      { status: 500 }
    );
  }
}
