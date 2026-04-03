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

// GET single recipe by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const recipe = await Recipe.findById(id)
      .populate('product', 'name sku price')
      .populate('ingredients.product', 'name sku unit cost');
    
    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ recipe }, { status: 200 });
  } catch (error: any) {
    console.error('Get recipe error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    );
  }
}

// PUT update recipe by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = await params;

    // Find existing recipe
    const existingRecipe = await Recipe.findById(id);
    if (!existingRecipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Get product details
    const productId = body.product || existingRecipe.product;
    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Process ingredients with costs if provided
    let processedIngredients = existingRecipe.ingredients;
    if (body.ingredients && body.ingredients.length > 0) {
      processedIngredients = await Promise.all(
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
    }

    // Calculate total cost
    const totalCost = processedIngredients.reduce((sum: number, ing: any) => sum + ing.cost, 0);
    const portionSize = body.portionSize || existingRecipe.portionSize;
    const yieldFactor = body.yieldFactor || existingRecipe.yieldFactor;
    const costPerPortion = totalCost / (portionSize * yieldFactor);

    // Update recipe
    const updatedRecipe = await Recipe.findByIdAndUpdate(
      id,
      {
        product: productId,
        productName: product.name,
        portionSize: body.portionSize || existingRecipe.portionSize,
        portionUnit: body.portionUnit || existingRecipe.portionUnit,
        yieldFactor: body.yieldFactor || existingRecipe.yieldFactor,
        prepTime: body.prepTime !== undefined ? body.prepTime : existingRecipe.prepTime,
        cookTime: body.cookTime !== undefined ? body.cookTime : existingRecipe.cookTime,
        instructions: body.instructions !== undefined ? body.instructions : existingRecipe.instructions,
        ingredients: processedIngredients,
        totalCost,
        costPerPortion,
        isActive: body.isActive !== undefined ? body.isActive : existingRecipe.isActive,
      },
      { new: true }
    )
      .populate('product', 'name sku price')
      .populate('ingredients.product', 'name sku unit cost');

    // Update product cost
    await Product.findByIdAndUpdate(productId, {
      cost: costPerPortion,
    });

    return NextResponse.json(
      { message: 'Recipe updated successfully', recipe: updatedRecipe },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Update recipe error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update recipe' },
      { status: 500 }
    );
  }
}

// DELETE recipe by ID
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await dbConnect();
    const { id } = await params;
    
    const recipe = await Recipe.findById(id);
    if (!recipe) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    // Instead of hard delete, mark as inactive (soft delete)
    await Recipe.findByIdAndUpdate(id, { isActive: false });

    // Update product to mark it no longer has active recipe
    await Product.findByIdAndUpdate(recipe.product, {
      hasRecipe: false,
      cost: 0, // Reset cost to 0
    });

    return NextResponse.json(
      { message: 'Recipe deleted successfully' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Delete recipe error:', error);
    return NextResponse.json(
      { error: 'Failed to delete recipe' },
      { status: 500 }
    );
  }
}
