# Final Project — MongoDB + Express + React


## Project Description

This project is a full-stack web application built with MongoDB, Express, Node.js, and React.


The system simulates a simple e-commerce platform with:

- users and authentication
- products management
- orders creation
- analytics based on sales data



## Technologies Used

### Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication



### Frontend
- React (Vite)
- Axios
- React Router



## Database Structure

Collections:

- \*\*users\*\* — user accounts, roles (user/admin)
- \*\*products\*\* — product catalog
- \*\*orders\*\* — customer orders with items and total price



Relationships:

- orders.userId → users.\_id
- orders.items.productId → products.\_id



## How to Run the Project

### 1 Start MongoDB

MongoDB must be running locally:
mongodb://127.0.0.1:27017

### 2 Backend Setup

cd backend
npm install


Create .env file:

PORT=4000

MONGO\_URI=mongodb://127.0.0.1:27017/final\_project

JWT\_SECRET=super\_secret\_key



Run backend:
npm run dev

### Backend will run on:
http://localhost:4000


### 3 Frontend Setup

cd frontend
npm install
npm run dev



Frontend will run on:

http://localhost:5173


Authentication

The project uses JWT authentication.
Protected routes require Authorization header:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTdmZDkwMmU1Y2ZmNmE4Y2E3MWRmOTAiLCJpYXQiOjE3Njk5ODY3OTcsImV4cCI6MTc3MDU5MTU5N30.WzseKgFPTPB1UIwuNixPcw1ovvd8ASVvLTX79F5PRIA



### API Endpoints

Auth
POST /auth/register
POST /auth/login

Users
GET /users/me

Products

GET /products
POST /products (admin only)
PATCH /products/:id (admin only)
DELETE /products/:id (admin only)

Orders
POST /orders
GET /orders
GET /orders/:id
PATCH /orders/:id/items ($push)
DELETE /orders/:id/items/:productId ($pull)
PATCH /orders/:id/status
DELETE /orders/:id (admin only)

Analytics (Aggregation)

GET /analytics/top-products
GET /analytics/revenue-by-country
GET /analytics/revenue-by-month

### Aggregation Features

Top products by revenue
Revenue grouped by country
Revenue grouped by month

### Team Members:

Daniyar Sharipov: Backend, Database, API
Nurlan Amangeldi: Frontend, UI, Integration



