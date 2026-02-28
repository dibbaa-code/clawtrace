import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

export const todosCollection = createCollection(
  localOnlyCollectionOptions<Todo>({
    id: 'todos',
    getKey: (item) => item.id,
  })
)
