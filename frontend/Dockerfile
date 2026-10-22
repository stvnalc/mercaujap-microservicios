FROM nginx:alpine

# Configuracion propia de Nginx para el frontend
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Archivos de la pagina web
COPY index.html style.css app.js /usr/share/nginx/html/

EXPOSE 80
