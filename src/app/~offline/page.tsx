import { WifiOff } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Offline | SPIRO',
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="max-w-md w-full flex flex-col items-center text-center space-y-6">
        <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center">
          <WifiOff className="h-12 w-12 text-muted-foreground" />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight">Estás desconectado</h1>
        
        <p className="text-muted-foreground">
          Parece que perdiste tu conexión a internet. SPIRO necesita internet para sincronizar tus tareas y el progreso de tu mascota.
        </p>
        
        <div className="pt-4">
          <Link 
            href="/" 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Reintentar conexión
          </Link>
        </div>
      </div>
    </div>
  );
}
