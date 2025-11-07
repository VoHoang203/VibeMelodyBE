// config/swagger.js
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Music App API",
            version: "1.0.0",
            description: "API documentation for the Music App (Auth, Artist, Media, Chat, etc.)",
        },
        servers: [
            {
                url: "http://localhost:5000/api",
                description: "Local server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
        securityDefinitions: {
            bearerAuth: {
                type: "apiKey",
                name: "Authorization",
                in: "header",
                description: "Nhập token JWT theo dạng: Bearer <token>",
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ["./routes/*.js"], // lấy mô tả từ tất cả route
};

const swaggerSpec = swaggerJsDoc(options);

export default function swaggerDocs(app) {
    app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

    app.get("/api-docs.json", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        res.send(swaggerSpec);
    });

    console.log("📘 Swagger Docs available at: http://localhost:5000/api-docs");
}
