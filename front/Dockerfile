# stage 1, build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV VITE_API_URL="http://localhost:8000"
RUN npm run build


# stage 2, serve with NGINX
FROM nginx:alpine

# copy from the previous build
COPY --from=builder /app/dist /usr/share/nginx/html

RUN echo 'server { \
    listen 80; \
    location / { \
            root /usr/share/nginx/html; \
            index index.html index.htm; \
            try_files $uri $uri/ /index.html; \
        } \
    }' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
