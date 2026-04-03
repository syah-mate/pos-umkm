import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IRecipeIngredient {
  product: mongoose.Types.ObjectId;
  productName: string;
  quantity: number;
  unit: string;
  cost: number;
}

export interface IRecipe extends Document {
  product: mongoose.Types.ObjectId;
  productName: string;
  portionSize: number;
  portionUnit: string;
  ingredients: IRecipeIngredient[];
  totalCost: number;
  costPerPortion: number;
  yieldFactor: number;
  instructions?: string;
  prepTime?: number;
  cookTime?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RecipeIngredientSchema = new Schema<IRecipeIngredient>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
  },
  unit: {
    type: String,
    required: true,
  },
  cost: {
    type: Number,
    required: true,
    min: 0,
  },
}, { _id: false });

const RecipeSchema = new Schema<IRecipe>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      unique: true,
    },
    productName: {
      type: String,
      required: true,
    },
    portionSize: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
    },
    portionUnit: {
      type: String,
      required: true,
      default: 'porsi',
    },
    ingredients: [RecipeIngredientSchema],
    totalCost: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    costPerPortion: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    yieldFactor: {
      type: Number,
      default: 1,
      min: 0.1,
      max: 1,
    },
    instructions: {
      type: String,
    },
    prepTime: {
      type: Number,
      min: 0,
    },
    cookTime: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Calculate costs before saving
RecipeSchema.pre('save', async function() {
  if (this.ingredients && this.ingredients.length > 0) {
    this.totalCost = this.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    this.costPerPortion = this.yieldFactor > 0 
      ? this.totalCost / (this.portionSize * this.yieldFactor)
      : this.totalCost / this.portionSize;
  }
});

// Index
RecipeSchema.index({ product: 1 });

const Recipe: Model<IRecipe> =
  mongoose.models.Recipe || mongoose.model<IRecipe>('Recipe', RecipeSchema);

export default Recipe;
