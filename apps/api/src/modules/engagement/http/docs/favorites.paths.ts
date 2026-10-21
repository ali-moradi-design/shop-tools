export const favoritesPaths = {
  "/api/v1/favorites": {
    "get": {
      "tags": [
        "Favorites"
      ],
      "summary": "List favorites",
      "description": "Each item carries the product title, slug, price (cents) and first image.",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "responses": {
        "200": {
          "description": "OK"
        }
      }
    },
    "post": {
      "tags": [
        "Favorites"
      ],
      "summary": "Add favorite",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "requestBody": {
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "required": [
                "productId"
              ],
              "properties": {
                "productId": {
                  "type": "string"
                }
              }
            }
          }
        }
      },
      "responses": {
        "201": {
          "description": "Created"
        }
      }
    }
  },
  "/api/v1/favorites/{productId}": {
    "delete": {
      "tags": [
        "Favorites"
      ],
      "summary": "Remove favorite",
      "security": [
        {
          "bearerAuth": []
        }
      ],
      "parameters": [
        {
          "name": "productId",
          "in": "path",
          "required": true,
          "schema": {
            "type": "string"
          }
        }
      ],
      "responses": {
        "200": {
          "description": "OK"
        }
      }
    }
  }
} as const;
