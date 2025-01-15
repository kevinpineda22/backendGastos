import app from './app.js';  // Asegúrate de que la ruta sea correcta
import http from 'http';

const server = http.createServer(app);

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
