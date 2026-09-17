import { redirect } from 'next/navigation';

// La raíz no tiene contenido propio: el producto empieza en el camino del
// usuario, que a su vez redirige a /login si no hay sesión.
export default function Home(): never {
  redirect('/camino');
}
