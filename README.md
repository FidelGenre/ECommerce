# ☕ Coffee Beans — E-commerce

Sistema de e-commerce para venta de café artesanal. Incluye tienda pública con carrito y pago por MercadoPago, y un panel de administración completo.

## 🗂️ Estructura

```
Ecommerce/
├── client/   # Frontend — Next.js 15 + TypeScript
└── server/   # Backend  — Spring Boot 3 + PostgreSQL
```

## 🚀 Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Java 21, Spring Boot 3, Spring Security (JWT) |
| Base de datos | PostgreSQL |
| Pagos | MercadoPago SDK |
| Tunnel (dev) | ngrok |

## ⚙️ Configuración

### Backend — `server/src/main/resources/application.properties`
Crear el archivo con los valores reales (está en `.gitignore`):

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/coffeebeansdb
spring.datasource.username=TU_USUARIO
spring.datasource.password=TU_PASSWORD

app.jwt.secret=TU_JWT_SECRET_64_CHARS_HEX

app.mercadopago.access-token=TU_MP_ACCESS_TOKEN
app.mercadopago.test-buyer-email=TU_MP_TEST_BUYER_EMAIL
app.mercadopago.public-base-url=https://TU_NGROK_URL.ngrok-free.dev

spring.mail.username=TU_EMAIL@gmail.com
spring.mail.password=TU_APP_PASSWORD_GMAIL
```

### Frontend — `client/.env.local` (opcional)
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## 🏃 Levantar el proyecto

```bash
# Backend
cd server
mvn spring-boot:run

# Frontend (en otra terminal)
cd client
npm install
npm run dev

# Tunnel para webhooks de MercadoPago
ngrok http 8080
```

La tienda queda disponible en `http://localhost:3000`.  
El panel admin en `http://localhost:3000/admin`.
