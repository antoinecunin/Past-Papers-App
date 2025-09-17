# syntax=docker/dockerfile:1
FROM node:20-alpine AS build
WORKDIR /app
# Le contexte est ./web → pas de préfixe "web/"
COPY package*.json ./
RUN npm ci
COPY . .
# Adapte si ton build sort dans "build" (CRA) au lieu de "dist"
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# (Optionnel) tu peux ajouter ta conf nginx ici si nécessaire
