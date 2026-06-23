import { create } from 'zustand';
import { TaskFormData } from '@/schemas/task.schema';

export type Task = TaskFormData & {
  id: string;
  position: number;
};

export type Column = {
  id: string;
  title: string;
};

interface TaskState {
  tasks: Task[];
  columns: Column[];
  setTasks: (tasks: Task[]) => void;
  setColumns: (columns: Column[]) => void;
  addTask: (task: Task) => void;
  moveTask: (taskId: string, newColumnId: string, newPosition: number) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: [],
  columns: [],
  setTasks: (tasks) => set({ tasks }),
  setColumns: (columns) => set({ columns }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  moveTask: (taskId, newColumnId, newPosition) => 
    set((state) => {
      const updatedTasks = state.tasks.map(t => 
        t.id === taskId ? { ...t, column_id: newColumnId, position: newPosition } : t
      );
      return { tasks: updatedTasks };
    }),
}));
