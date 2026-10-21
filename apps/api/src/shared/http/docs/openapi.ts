import { authPaths } from '@modules/identity/http/docs/auth.paths';
import { usersPaths } from '@modules/identity/http/docs/users.paths';
import { rbacPaths } from '@modules/identity/http/docs/rbac.paths';
import { productsPaths } from '@modules/catalog/http/docs/products.paths';
import { categoriesPaths } from '@modules/catalog/http/docs/categories.paths';
import { uploadsPaths } from '@modules/catalog/http/docs/uploads.paths';
import { cartPaths } from '@modules/ordering/http/docs/cart.paths';
import { ordersPaths } from '@modules/ordering/http/docs/orders.paths';
import { discountsPaths } from '@modules/promotions/http/docs/discounts.paths';
import { favoritesPaths } from '@modules/engagement/http/docs/favorites.paths';
import { reviewsPaths } from '@modules/reviews/http/docs/reviews.paths';
import { reportsPaths } from '@modules/reporting/http/docs/reports.paths';
import { adminPaths } from '@modules/reporting/http/docs/admin.paths';
import { otherPaths } from './other.paths';
import { shopSchemas } from './shop.schemas';

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
  "title": "Toolbench API",
  "version": "2.0.0",
  "description": "Tools shop API (Express 5 + MySQL, modular monolith). Products belong to a category that defines their technical specifications (filter with `spec.<key>=<value>`, ranges and units supported); each product has variants (kits) with stock per warehouse; up to four products can be compared. All money is in minor units (cents). Auth: Bearer header or httpOnly cookies. Visitors get a guest cart (httpOnly guestCart cookie) that is merged at sign-in. Cookie-authenticated writes must come from an allowed origin (CORS_ORIGIN). Business routes are under /api/v1."
},
  servers: [
  {
    "url": "/",
    "description": "This server"
  },
  {
    "url": "http://localhost:4000",
    "description": "Local development"
  }
],
  components: {
  "securitySchemes": {
    "bearerAuth": {
      "type": "http",
      "scheme": "bearer",
      "bearerFormat": "JWT",
      "description": "Preferred for API clients. Checked before the accessToken cookie."
    },
    "guestCart": {
      "type": "apiKey",
      "in": "cookie",
      "name": "guestCart",
      "description": "httpOnly cookie the API sets for a visitor's cart (random UUID). Merged into the account by POST /cart/merge."
    },
    "cookieAuth": {
      "type": "apiKey",
      "in": "cookie",
      "name": "accessToken",
      "description": "httpOnly accessToken cookie set on register/login/refresh. Use with credentials: include."
    }
  },
  "schemas": {
    ...shopSchemas,
    "Error": {
      "type": "object",
      "properties": {
        "message": {
          "type": "string"
        },
        "errors": {}
      }
    },
    "RegisterRequest": {
      "type": "object",
      "required": [
        "name",
        "email",
        "password"
      ],
      "properties": {
        "name": {
          "type": "string"
        },
        "email": {
          "type": "string",
          "format": "email"
        },
        "password": {
          "type": "string",
          "minLength": 8
        }
      }
    },
    "LoginRequest": {
      "type": "object",
      "required": [
        "email",
        "password"
      ],
      "properties": {
        "email": {
          "type": "string"
        },
        "password": {
          "type": "string"
        }
      }
    },
    "ShippingAddress": {
      "type": "object",
      "required": [
        "fullName",
        "line1",
        "city",
        "postalCode",
        "country"
      ],
      "properties": {
        "fullName": {
          "type": "string"
        },
        "line1": {
          "type": "string"
        },
        "line2": {
          "type": "string"
        },
        "city": {
          "type": "string"
        },
        "state": {
          "type": "string"
        },
        "postalCode": {
          "type": "string"
        },
        "country": {
          "type": "string"
        }
      }
    },
    "Discount": {
      "type": "object",
      "properties": {
        "code": {
          "type": "string"
        },
        "type": {
          "type": "string",
          "enum": [
            "percent",
            "fixed"
          ]
        },
        "value": {
          "type": "number",
          "description": "Percent (0–100) for percent codes; cents for fixed codes"
        },
        "minOrderAmount": {
          "type": "integer",
          "description": "Minimum subtotal in cents"
        },
        "maxUses": {
          "type": "integer"
        },
        "usedCount": {
          "type": "integer"
        },
        "startsAt": {
          "type": "string",
          "format": "date-time"
        },
        "endsAt": {
          "type": "string",
          "format": "date-time"
        },
        "isActive": {
          "type": "boolean"
        }
      }
    }
  }
},
  paths: {
    ...authPaths,
    ...productsPaths,
    ...categoriesPaths,
    ...cartPaths,
    ...ordersPaths,
    ...discountsPaths,
    ...favoritesPaths,
    ...reviewsPaths,
    ...usersPaths,
    ...rbacPaths,
    ...reportsPaths,
    ...adminPaths,
    ...uploadsPaths,
    ...otherPaths,
  },
} as const;
