export type CategoryType = 'income' | 'expense';

export interface CategoryDTO {
  id: number;
  name: string;
  type: CategoryType;
}
