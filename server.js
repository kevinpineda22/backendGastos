import app from './app.js';  // Asegúrate de que la ruta a tu app sea correcta
import http from 'http';

// Crear el servidor HTTP
const server = http.createServer(app);

// Puerto de escucha (Vercel maneja el puerto de forma automática)
const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
