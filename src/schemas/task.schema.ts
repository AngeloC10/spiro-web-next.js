import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().min(1, 'El título es requerido').max(100),
  description: z.string().max(500).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  column_id: z.string().uuid(),
});

export type TaskFormData = z.infer<typeof taskSchema>;
