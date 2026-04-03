import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/models/Transaction';
import Product from '@/models/Product';
import Customer from '@/models/Customer';
import Recipe from '@/models/Recipe';
import User from '@/models/User';

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

// Helper function to round stock to 2 decimal places
function roundStock(value: number): number {
  return Math.round(value * 100) / 100;
}

// GET all transactions with filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    // Ensure User model is registered
    await User.init();
    
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const cashier = searchParams.get('cashier');
    const paymentMethod = searchParams.get('paymentMethod');
    
    const query: any = {};
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }
    
    if (cashier) {
      query.cashier = cashier;
    }
    
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }
    
    const transactions = await Transaction.find(query)
      .populate('cashier', 'name')
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 })
      .limit(100);
    
    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}

// POST create new transaction
export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Transaction must have at least one item' },
        { status: 400 }
      );
    }

    // Generate invoice number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await Transaction.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999)),
      },
    });
    const invoiceNumber = `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    // Process stock deduction for each item
    for (const item of body.items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productName} not found` },
          { status: 404 }
        );
      }

      // Check if product has recipe
      if (product.hasRecipe) {
        const recipe = await Recipe.findOne({ product: product._id, isActive: true })
          .populate('ingredients.product');
        
        if (recipe) {
          // First, check if we have enough product stock
          if (product.stock < item.quantity) {
            return NextResponse.json(
              { error: `Insufficient stock for product: ${product.name}` },
              { status: 400 }
            );
          }

          // Deduct ingredients stock based on recipe
          for (const ingredient of recipe.ingredients) {
            const ingredientProduct = await Product.findById(ingredient.product);
            if (ingredientProduct) {
              // Calculate quantity needed based on recipe
              const qtyNeededInRecipeUnit = ingredient.quantity * item.quantity;
              
              // Convert from recipe unit to product stock unit
              let qtyToDeduct: number;
              try {
                qtyToDeduct = convertUnit(
                  qtyNeededInRecipeUnit,
                  ingredient.unit,
                  ingredientProduct.unit
                );
              } catch (error: any) {
                return NextResponse.json(
                  { error: `Unit conversion error: ${error.message}` },
                  { status: 400 }
                );
              }
              
              if (ingredientProduct.stock < qtyToDeduct) {
                return NextResponse.json(
                  { error: `Insufficient stock for ingredient: ${ingredient.productName}. Need ${qtyToDeduct} ${ingredientProduct.unit}, only ${ingredientProduct.stock} ${ingredientProduct.unit} available` },
                  { status: 400 }
                );
              }
              
              ingredientProduct.stock = roundStock(ingredientProduct.stock - qtyToDeduct);
              await ingredientProduct.save();
            }
          }

          // IMPORTANT: Also deduct the product stock itself (finished goods)
          product.stock = roundStock(product.stock - item.quantity);
          await product.save();
        } else {
          // If no recipe found, deduct product stock directly
          if (product.stock < item.quantity) {
            return NextResponse.json(
              { error: `Insufficient stock for product: ${product.name}` },
              { status: 400 }
            );
          }
          product.stock = roundStock(product.stock - item.quantity);
          await product.save();
        }
      } else {
        // Normal product without recipe
        if (product.stock < item.quantity) {
          return NextResponse.json(
            { error: `Insufficient stock for product: ${product.name}` },
            { status: 400 }
          );
        }
        product.stock = roundStock(product.stock - item.quantity);
        await product.save();
      }
    }

    // Update customer stats if provided
    if (body.customer) {
      await Customer.findByIdAndUpdate(body.customer, {
        $inc: {
          totalSpent: body.total,
          transactionCount: 1,
          loyaltyPoints: Math.floor(body.total / 1000), // 1 point per 1000
        },
        lastVisit: new Date(),
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      ...body,
      invoiceNumber,
      paymentStatus: 'paid',
      isSynced: true,
      syncedAt: new Date(),
    });

    // Ensure User model is registered before populate
    await User.init();
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('cashier', 'name')
      .populate('customer', 'name phone');

    return NextResponse.json(
      { message: 'Transaction created successfully', transaction: populatedTransaction },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create transaction error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create transaction' },
      { status: 500 }
    );
  }
}
