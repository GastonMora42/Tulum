"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdate_N_E"]("app/(auth)/login/page",{

/***/ "(app-pages-browser)/./src/server/services/auth/authService.ts":
/*!*************************************************!*\
  !*** ./src/server/services/auth/authService.ts ***!
  \*************************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   AuthService: () => (/* binding */ AuthService),\n/* harmony export */   authService: () => (/* binding */ authService),\n/* harmony export */   refreshToken: () => (/* binding */ refreshToken)\n/* harmony export */ });\n/* harmony import */ var _server_db_client__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/server/db/client */ \"(app-pages-browser)/./src/server/db/client.ts\");\n/* harmony import */ var _cognitoService__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./cognitoService */ \"(app-pages-browser)/./src/server/services/auth/cognitoService.ts\");\n// src/server/services/auth/authService.ts\n\n\n// Servicio de autenticación que actúa como fachada para Cognito\nclass AuthService {\n    // Login\n    async login(credentials) {\n        try {\n            // Autenticar con Cognito\n            const cognitoResult = await _cognitoService__WEBPACK_IMPORTED_MODULE_1__.cognitoService.login(credentials);\n            // Buscar usuario en nuestra BD\n            let user = await _server_db_client__WEBPACK_IMPORTED_MODULE_0__[\"default\"].user.findFirst({\n                where: {\n                    email: credentials.email\n                },\n                include: {\n                    role: true\n                }\n            });\n            console.log('Usuario encontrado:', user);\n            console.log('Rol del usuario:', user === null || user === void 0 ? void 0 : user.role);\n            // Si no existe el usuario, lo creamos\n            if (!user) {\n                console.log(\"Usuario no encontrado en BD local, creando...\");\n                // Buscar primero un rol (preferiblemente admin)\n                let role = await _server_db_client__WEBPACK_IMPORTED_MODULE_0__[\"default\"].role.findFirst({\n                    where: {\n                        name: 'admin'\n                    }\n                });\n                // Si no existe ningún rol, necesitamos crear al menos uno\n                if (!role) {\n                    console.log(\"Creando rol 'admin' porque no existe\");\n                    role = await _server_db_client__WEBPACK_IMPORTED_MODULE_0__[\"default\"].role.create({\n                        data: {\n                            name: 'admin',\n                            permissions: [\n                                '*'\n                            ] // Todos los permisos como JSON\n                        }\n                    });\n                }\n                // Crear el usuario con el rol encontrado o creado\n                user = await _server_db_client__WEBPACK_IMPORTED_MODULE_0__[\"default\"].user.create({\n                    data: {\n                        id: cognitoResult.user.id,\n                        email: credentials.email,\n                        name: cognitoResult.user.name || credentials.email.split('@')[0],\n                        roleId: role.id\n                    },\n                    include: {\n                        role: true\n                    }\n                });\n                console.log(\"Usuario creado exitosamente:\", user.id);\n            }\n            // Devolvemos el resultado combinado\n            return {\n                ...cognitoResult,\n                user: {\n                    ...user,\n                    // Asegurarse de que usamos los datos de nuestra BD\n                    id: user.id,\n                    roleId: user.roleId\n                }\n            };\n        } catch (error) {\n            console.error('Error en login:', error);\n            throw error; // Propagar el error para que el cliente pueda manejarlo\n        }\n    }\n    // Cerrar sesión\n    async logout(accessToken) {\n        try {\n            await _cognitoService__WEBPACK_IMPORTED_MODULE_1__.cognitoService.logout(accessToken);\n            return true;\n        } catch (error) {\n            console.error('Error en logout:', error);\n            return false;\n        }\n    }\n    // Refrescar token\n    async refreshUserToken(refreshToken, email) {\n        try {\n            return await _cognitoService__WEBPACK_IMPORTED_MODULE_1__.cognitoService.refreshToken(refreshToken);\n        } catch (error) {\n            console.error('Error al refrescar token:', error);\n            return null;\n        }\n    }\n    // Obtener usuario por ID\n    async getUserById(userId) {\n        try {\n            const user = await _server_db_client__WEBPACK_IMPORTED_MODULE_0__[\"default\"].user.findUnique({\n                where: {\n                    id: userId\n                },\n                include: {\n                    role: true\n                }\n            });\n            if (!user) return null;\n            return user;\n        } catch (error) {\n            console.error('Error al obtener usuario:', error);\n            return null;\n        }\n    }\n    // Crear usuario (admin)\n    async createUser(userData) {\n        try {\n            // Verificar que el rol existe\n            const roleExists = await _server_db_client__WEBPACK_IMPORTED_MODULE_0__[\"default\"].role.findUnique({\n                where: {\n                    id: userData.roleId\n                }\n            });\n            if (!roleExists) {\n                throw new Error(\"El rol con ID \".concat(userData.roleId, \" no existe\"));\n            }\n            // Si se proporciona sucursalId, verificar que existe\n            if (userData.sucursalId) {\n                const sucursalExists = await _server_db_client__WEBPACK_IMPORTED_MODULE_0__[\"default\"].ubicacion.findUnique({\n                    where: {\n                        id: userData.sucursalId\n                    }\n                });\n                if (!sucursalExists) {\n                    throw new Error(\"La ubicaci\\xf3n con ID \".concat(userData.sucursalId, \" no existe\"));\n                }\n            }\n            // Crear usuario en Cognito\n            await _cognitoService__WEBPACK_IMPORTED_MODULE_1__.cognitoService.createUser({\n                email: userData.email,\n                name: userData.name,\n                password: userData.password,\n                roleId: userData.roleId\n            });\n            // Crear usuario en nuestra BD\n            const user = await _server_db_client__WEBPACK_IMPORTED_MODULE_0__[\"default\"].user.create({\n                data: {\n                    email: userData.email,\n                    name: userData.name,\n                    roleId: userData.roleId,\n                    sucursalId: userData.sucursalId || null\n                }\n            });\n            return user;\n        } catch (error) {\n            console.error('Error al crear usuario:', error);\n            throw error;\n        }\n    }\n    // Registrar un nuevo usuario\n    async registerUser(userData) {\n        try {\n            // Registrar en Cognito\n            const cognitoResult = await _cognitoService__WEBPACK_IMPORTED_MODULE_1__.cognitoService.registerUser({\n                email: userData.email,\n                name: userData.name,\n                password: userData.password\n            });\n            if (!cognitoResult.success) {\n                return {\n                    success: false,\n                    message: cognitoResult.message || 'Error al registrar usuario en Cognito',\n                    userId: cognitoResult.userId\n                };\n            }\n            return {\n                success: true,\n                message: cognitoResult.message || 'Usuario registrado exitosamente',\n                userId: cognitoResult.userId\n            };\n        } catch (error) {\n            console.error('Error en registro:', error);\n            return {\n                success: false,\n                message: 'Error al registrar usuario'\n            };\n        }\n    }\n    // Confirmar registro\n    async confirmRegistration(email, code) {\n        try {\n            return await _cognitoService__WEBPACK_IMPORTED_MODULE_1__.cognitoService.confirmRegistration(email, code);\n        } catch (error) {\n            console.error('Error al confirmar registro:', error);\n            return {\n                success: false,\n                message: 'Error al confirmar el registro'\n            };\n        }\n    }\n    // Reenviar código de confirmación\n    async resendConfirmationCode(email) {\n        try {\n            return await _cognitoService__WEBPACK_IMPORTED_MODULE_1__.cognitoService.resendConfirmationCode(email);\n        } catch (error) {\n            console.error('Error al reenviar código:', error);\n            return {\n                success: false,\n                message: 'Error al reenviar el código de verificación'\n            };\n        }\n    }\n}\n// Singleton para uso en la aplicación\nconst authService = new AuthService();\n// Función para el cliente (frontend)\nasync function refreshToken() {\n    const refreshToken = localStorage.getItem('refreshToken');\n    if (!refreshToken) return false;\n    try {\n        const response = await fetch('/api/auth/refresh', {\n            method: 'POST',\n            headers: {\n                'Content-Type': 'application/json'\n            },\n            body: JSON.stringify({\n                refreshToken\n            })\n        });\n        if (!response.ok) return false;\n        const data = await response.json();\n        // Actualizar tokens\n        localStorage.setItem('accessToken', data.accessToken);\n        localStorage.setItem('idToken', data.idToken);\n        return true;\n    } catch (error) {\n        console.error('Error al refrescar token:', error);\n        return false;\n    }\n}\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL3NyYy9zZXJ2ZXIvc2VydmljZXMvYXV0aC9hdXRoU2VydmljZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBLDBDQUEwQztBQUVGO0FBQ3dDO0FBRWhGLGdFQUFnRTtBQUN6RCxNQUFNRTtJQUNYLFFBQVE7SUFDUixNQUFNQyxNQUFNQyxXQUE2QixFQUE4QjtRQUNyRSxJQUFJO1lBQ0YseUJBQXlCO1lBQ3pCLE1BQU1DLGdCQUFnQixNQUFNSiwyREFBY0EsQ0FBQ0UsS0FBSyxDQUFDQztZQUVqRCwrQkFBK0I7WUFDL0IsSUFBSUUsT0FBTyxNQUFNTix5REFBTUEsQ0FBQ00sSUFBSSxDQUFDQyxTQUFTLENBQUM7Z0JBQ3JDQyxPQUFPO29CQUNMQyxPQUFPTCxZQUFZSyxLQUFLO2dCQUMxQjtnQkFDQUMsU0FBUztvQkFDUEMsTUFBTTtnQkFDUjtZQUNGO1lBRUlDLFFBQVFDLEdBQUcsQ0FBQyx1QkFBdUJQO1lBQ3pDTSxRQUFRQyxHQUFHLENBQUMsb0JBQW9CUCxpQkFBQUEsMkJBQUFBLEtBQU1LLElBQUk7WUFFeEMsc0NBQXNDO1lBQ3RDLElBQUksQ0FBQ0wsTUFBTTtnQkFDVE0sUUFBUUMsR0FBRyxDQUFDO2dCQUVaLGdEQUFnRDtnQkFDaEQsSUFBSUYsT0FBTyxNQUFNWCx5REFBTUEsQ0FBQ1csSUFBSSxDQUFDSixTQUFTLENBQUM7b0JBQ3JDQyxPQUFPO3dCQUFFTSxNQUFNO29CQUFRO2dCQUN6QjtnQkFFQSwwREFBMEQ7Z0JBQzFELElBQUksQ0FBQ0gsTUFBTTtvQkFDVEMsUUFBUUMsR0FBRyxDQUFDO29CQUNaRixPQUFPLE1BQU1YLHlEQUFNQSxDQUFDVyxJQUFJLENBQUNJLE1BQU0sQ0FBQzt3QkFDOUJDLE1BQU07NEJBQ0pGLE1BQU07NEJBQ05HLGFBQWE7Z0NBQUM7NkJBQUksQ0FBQywrQkFBK0I7d0JBQ3BEO29CQUNGO2dCQUNGO2dCQUVBLGtEQUFrRDtnQkFDbERYLE9BQU8sTUFBTU4seURBQU1BLENBQUNN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ZXJzL2dhc3Rvbm1vcmEvRGVza3RvcC9Qcm95ZWN0b3MvVHVsdW0vc3JjL3NlcnZlci9zZXJ2aWNlcy9hdXRoL2F1dGhTZXJ2aWNlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIHNyYy9zZXJ2ZXIvc2VydmljZXMvYXV0aC9hdXRoU2VydmljZS50c1xuaW1wb3J0IHsgVXNlciB9IGZyb20gJ0BwcmlzbWEvY2xpZW50JztcbmltcG9ydCBwcmlzbWEgZnJvbSAnQC9zZXJ2ZXIvZGIvY2xpZW50JztcbmltcG9ydCB7IGNvZ25pdG9TZXJ2aWNlLCBMb2dpbkNyZWRlbnRpYWxzLCBBdXRoUmVzdWx0IH0gZnJvbSAnLi9jb2duaXRvU2VydmljZSc7XG5cbi8vIFNlcnZpY2lvIGRlIGF1dGVudGljYWNpw7NuIHF1ZSBhY3TDumEgY29tbyBmYWNoYWRhIHBhcmEgQ29nbml0b1xuZXhwb3J0IGNsYXNzIEF1dGhTZXJ2aWNlIHtcbiAgLy8gTG9naW5cbiAgYXN5bmMgbG9naW4oY3JlZGVudGlhbHM6IExvZ2luQ3JlZGVudGlhbHMpOiBQcm9taXNlPEF1dGhSZXN1bHQgfCBudWxsPiB7XG4gICAgdHJ5IHtcbiAgICAgIC8vIEF1dGVudGljYXIgY29uIENvZ25pdG9cbiAgICAgIGNvbnN0IGNvZ25pdG9SZXN1bHQgPSBhd2FpdCBjb2duaXRvU2VydmljZS5sb2dpbihjcmVkZW50aWFscyk7XG4gICAgICBcbiAgICAgIC8vIEJ1c2NhciB1c3VhcmlvIGVuIG51ZXN0cmEgQkRcbiAgICAgIGxldCB1c2VyID0gYXdhaXQgcHJpc21hLnVzZXIuZmluZEZpcnN0KHtcbiAgICAgICAgd2hlcmU6IHsgXG4gICAgICAgICAgZW1haWw6IGNyZWRlbnRpYWxzLmVtYWlsIFxuICAgICAgICB9LFxuICAgICAgICBpbmNsdWRlOiB7IFxuICAgICAgICAgIHJvbGU6IHRydWUgXG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgXG4gICAgICAgICAgY29uc29sZS5sb2coJ1VzdWFyaW8gZW5jb250cmFkbzonLCB1c2VyKTtcbiAgICBjb25zb2xlLmxvZygnUm9sIGRlbCB1c3VhcmlvOicsIHVzZXI/LnJvbGUpO1xuICAgIFxuICAgICAgLy8gU2kgbm8gZXhpc3RlIGVsIHVzdWFyaW8sIGxvIGNyZWFtb3NcbiAgICAgIGlmICghdXNlcikge1xuICAgICAgICBjb25zb2xlLmxvZyhcIlVzdWFyaW8gbm8gZW5jb250cmFkbyBlbiBCRCBsb2NhbCwgY3JlYW5kby4uLlwiKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1c2NhciBwcmltZXJvIHVuIHJvbCAocHJlZmVyaWJsZW1lbnRlIGFkbWluKVxuICAgICAgICBsZXQgcm9sZSA9IGF3YWl0IHByaXNtYS5yb2xlLmZpbmRGaXJzdCh7XG4gICAgICAgICAgd2hlcmU6IHsgbmFtZTogJ2FkbWluJyB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2kgbm8gZXhpc3RlIG5pbmfDum4gcm9sLCBuZWNlc2l0YW1vcyBjcmVhciBhbCBtZW5vcyB1bm9cbiAgICAgICAgaWYgKCFyb2xlKSB7XG4gICAgICAgICAgY29uc29sZS5sb2coXCJDcmVhbmRvIHJvbCAnYWRtaW4nIHBvcnF1ZSBubyBleGlzdGVcIik7XG4gICAgICAgICAgcm9sZSA9IGF3YWl0IHByaXNtYS5yb2xlLmNyZWF0ZSh7XG4gICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgIG5hbWU6ICdhZG1pbicsXG4gICAgICAgICAgICAgIHBlcm1pc3Npb25zOiBbJyonXSAvLyBUb2RvcyBsb3MgcGVybWlzb3MgY29tbyBKU09OXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENyZWFyIGVsIHVzdWFyaW8gY29uIGVsIHJvbCBlbmNvbnRyYWRvIG8gY3JlYWRvXG4gICAgICAgIHVzZXIgPSBhd2FpdCBwcmlzbWEudXNlci5jcmVhdGUoe1xuICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgIGlkOiBjb2duaXRvUmVzdWx0LnVzZXIuaWQsIC8vIFVzYXIgZWwgc3ViIGRlIENvZ25pdG8gY29tbyBJRFxuICAgICAgICAgICAgZW1haWw6IGNyZWRlbnRpYWxzLmVtYWlsLFxuICAgICAgICAgICAgbmFtZTogY29nbml0b1Jlc3VsdC51c2VyLm5hbWUgfHwgY3JlZGVudGlhbHMuZW1haWwuc3BsaXQoJ0AnKVswXSxcbiAgICAgICAgICAgIHJvbGVJZDogcm9sZS5pZCxcbiAgICAgICAgICAgIC8vIE5vIGluY2x1aW1vcyBzdWN1cnNhbElkIHlhIHF1ZSBlcyBvcGNpb25hbCBlbiB0dSBlc3F1ZW1hXG4gICAgICAgICAgfSxcbiAgICAgICAgICBpbmNsdWRlOiB7IFxuICAgICAgICAgICAgcm9sZTogdHJ1ZSBcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc29sZS5sb2coXCJVc3VhcmlvIGNyZWFkbyBleGl0b3NhbWVudGU6XCIsIHVzZXIuaWQpO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBEZXZvbHZlbW9zIGVsIHJlc3VsdGFkbyBjb21iaW5hZG9cbiAgICAgIHJldHVybiB7XG4gICAgICAgIC4uLmNvZ25pdG9SZXN1bHQsXG4gICAgICAgIHVzZXI6IHtcbiAgICAgICAgICAuLi51c2VyLFxuICAgICAgICAgIC8vIEFzZWd1cmFyc2UgZGUgcXVlIHVzYW1vcyBsb3MgZGF0b3MgZGUgbnVlc3RyYSBCRFxuICAgICAgICAgIGlkOiB1c2VyLmlkLFxuICAgICAgICAgIHJvbGVJZDogdXNlci5yb2xlSWRcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZW4gbG9naW46JywgZXJyb3IpO1xuICAgICAgdGhyb3cgZXJyb3I7IC8vIFByb3BhZ2FyIGVsIGVycm9yIHBhcmEgcXVlIGVsIGNsaWVudGUgcHVlZGEgbWFuZWphcmxvXG4gICAgfVxuICB9XG4gIFxuICAvLyBDZXJyYXIgc2VzacOzblxuICBhc3luYyBsb2dvdXQoYWNjZXNzVG9rZW46IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRyeSB7XG4gICAgICBhd2FpdCBjb2duaXRvU2VydmljZS5sb2dvdXQoYWNjZXNzVG9rZW4pO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGVuIGxvZ291dDonLCBlcnJvcik7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIFxuICAvLyBSZWZyZXNjYXIgdG9rZW5cbiAgYXN5bmMgcmVmcmVzaFVzZXJUb2tlbihyZWZyZXNoVG9rZW46IHN0cmluZywgZW1haWw6IGFueSk6IFByb21pc2U8T21pdDxBdXRoUmVzdWx0LCAndXNlcic+IHwgbnVsbD4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgY29nbml0b1NlcnZpY2UucmVmcmVzaFRva2VuKHJlZnJlc2hUb2tlbik7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGFsIHJlZnJlc2NhciB0b2tlbjonLCBlcnJvcik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG4gIH1cbiAgXG4gIC8vIE9idGVuZXIgdXN1YXJpbyBwb3IgSURcbiAgYXN5bmMgZ2V0VXNlckJ5SWQodXNlcklkOiBzdHJpbmcpOiBQcm9taXNlPE9taXQ8VXNlciwgJ3Bhc3N3b3JkJz4gfCBudWxsPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHVzZXIgPSBhd2FpdCBwcmlzbWEudXNlci5maW5kVW5pcXVlKHtcbiAgICAgICAgd2hlcmU6IHsgaWQ6IHVzZXJJZCB9LFxuICAgICAgICBpbmNsdWRlOiB7IHJvbGU6IHRydWUgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICghdXNlcikgcmV0dXJuIG51bGw7XG4gICAgICBcbiAgICAgIHJldHVybiB1c2VyO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBhbCBvYnRlbmVyIHVzdWFyaW86JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG4gIFxuICAvLyBDcmVhciB1c3VhcmlvIChhZG1pbilcbiAgYXN5bmMgY3JlYXRlVXNlcih1c2VyRGF0YToge1xuICAgIGVtYWlsOiBzdHJpbmc7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIHBhc3N3b3JkOiBzdHJpbmc7XG4gICAgcm9sZUlkOiBzdHJpbmc7XG4gICAgc3VjdXJzYWxJZD86IHN0cmluZztcbiAgfSk6IFByb21pc2U8VXNlciB8IG51bGw+IHtcbiAgICB0cnkge1xuICAgICAgLy8gVmVyaWZpY2FyIHF1ZSBlbCByb2wgZXhpc3RlXG4gICAgICBjb25zdCByb2xlRXhpc3RzID0gYXdhaXQgcHJpc21hLnJvbGUuZmluZFVuaXF1ZSh7XG4gICAgICAgIHdoZXJlOiB7IGlkOiB1c2VyRGF0YS5yb2xlSWQgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIGlmICghcm9sZUV4aXN0cykge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEVsIHJvbCBjb24gSUQgJHt1c2VyRGF0YS5yb2xlSWR9IG5vIGV4aXN0ZWApO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBTaSBzZSBwcm9wb3JjaW9uYSBzdWN1cnNhbElkLCB2ZXJpZmljYXIgcXVlIGV4aXN0ZVxuICAgICAgaWYgKHVzZXJEYXRhLnN1Y3Vyc2FsSWQpIHtcbiAgICAgICAgY29uc3Qgc3VjdXJzYWxFeGlzdHMgPSBhd2FpdCBwcmlzbWEudWJpY2FjaW9uLmZpbmRVbmlxdWUoe1xuICAgICAgICAgIHdoZXJlOiB7IGlkOiB1c2VyRGF0YS5zdWN1cnNhbElkIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoIXN1Y3Vyc2FsRXhpc3RzKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBMYSB1YmljYWNpw7NuIGNvbiBJRCAke3VzZXJEYXRhLnN1Y3Vyc2FsSWR9IG5vIGV4aXN0ZWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIENyZWFyIHVzdWFyaW8gZW4gQ29nbml0b1xuICAgICAgYXdhaXQgY29nbml0b1NlcnZpY2UuY3JlYXRlVXNlcih7XG4gICAgICAgIGVtYWlsOiB1c2VyRGF0YS5lbWFpbCxcbiAgICAgICAgbmFtZTogdXNlckRhdGEubmFtZSxcbiAgICAgICAgcGFzc3dvcmQ6IHVzZXJEYXRhLnBhc3N3b3JkLFxuICAgICAgICByb2xlSWQ6IHVzZXJEYXRhLnJvbGVJZFxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIC8vIENyZWFyIHVzdWFyaW8gZW4gbnVlc3RyYSBCRFxuICAgICAgY29uc3QgdXNlciA9IGF3YWl0IHByaXNtYS51c2VyLmNyZWF0ZSh7XG4gICAgICAgIGRhdGE6IHtcbiAgICAgICAgICBlbWFpbDogdXNlckRhdGEuZW1haWwsXG4gICAgICAgICAgbmFtZTogdXNlckRhdGEubmFtZSxcbiAgICAgICAgICByb2xlSWQ6IHVzZXJEYXRhLnJvbGVJZCxcbiAgICAgICAgICBzdWN1cnNhbElkOiB1c2VyRGF0YS5zdWN1cnNhbElkIHx8IG51bGxcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBcbiAgICAgIHJldHVybiB1c2VyO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBhbCBjcmVhciB1c3VhcmlvOicsIGVycm9yKTtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cbiAgfVxuXG4gIC8vIFJlZ2lzdHJhciB1biBudWV2byB1c3VhcmlvXG4gIGFzeW5jIHJlZ2lzdGVyVXNlcih1c2VyRGF0YToge1xuICAgIGVtYWlsOiBzdHJpbmc7XG4gICAgbmFtZTogc3RyaW5nO1xuICAgIHBhc3N3b3JkOiBzdHJpbmc7XG4gIH0pOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgbWVzc2FnZTogc3RyaW5nOyB1c2VySWQ/OiBzdHJpbmcgfT4ge1xuICAgIHRyeSB7XG4gICAgICAvLyBSZWdpc3RyYXIgZW4gQ29nbml0b1xuICAgICAgY29uc3QgY29nbml0b1Jlc3VsdCA9IGF3YWl0IGNvZ25pdG9TZXJ2aWNlLnJlZ2lzdGVyVXNlcih7XG4gICAgICAgIGVtYWlsOiB1c2VyRGF0YS5lbWFpbCxcbiAgICAgICAgbmFtZTogdXNlckRhdGEubmFtZSxcbiAgICAgICAgcGFzc3dvcmQ6IHVzZXJEYXRhLnBhc3N3b3JkXG4gICAgICB9KTtcbiAgICAgIGlmICghY29nbml0b1Jlc3VsdC5zdWNjZXNzKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogY29nbml0b1Jlc3VsdC5tZXNzYWdlIHx8ICdFcnJvciBhbCByZWdpc3RyYXIgdXN1YXJpbyBlbiBDb2duaXRvJyxcbiAgICAgICAgICB1c2VySWQ6IGNvZ25pdG9SZXN1bHQudXNlcklkXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgICBcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6IGNvZ25pdG9SZXN1bHQubWVzc2FnZSB8fCAnVXN1YXJpbyByZWdpc3RyYWRvIGV4aXRvc2FtZW50ZScsXG4gICAgICAgIHVzZXJJZDogY29nbml0b1Jlc3VsdC51c2VySWRcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGVuIHJlZ2lzdHJvOicsIGVycm9yKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBtZXNzYWdlOiAnRXJyb3IgYWwgcmVnaXN0cmFyIHVzdWFyaW8nXG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIC8vIENvbmZpcm1hciByZWdpc3Ryb1xuICBhc3luYyBjb25maXJtUmVnaXN0cmF0aW9uKGVtYWlsOiBzdHJpbmcsIGNvZGU6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgY29nbml0b1NlcnZpY2UuY29uZmlybVJlZ2lzdHJhdGlvbihlbWFpbCwgY29kZSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGFsIGNvbmZpcm1hciByZWdpc3RybzonLCBlcnJvcik7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0Vycm9yIGFsIGNvbmZpcm1hciBlbCByZWdpc3RybydcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLy8gUmVlbnZpYXIgY8OzZGlnbyBkZSBjb25maXJtYWNpw7NuXG4gIGFzeW5jIHJlc2VuZENvbmZpcm1hdGlvbkNvZGUoZW1haWw6IHN0cmluZyk6IFByb21pc2U8eyBzdWNjZXNzOiBib29sZWFuOyBtZXNzYWdlOiBzdHJpbmcgfT4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gYXdhaXQgY29nbml0b1NlcnZpY2UucmVzZW5kQ29uZmlybWF0aW9uQ29kZShlbWFpbCk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGFsIHJlZW52aWFyIGPDs2RpZ286JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIG1lc3NhZ2U6ICdFcnJvciBhbCByZWVudmlhciBlbCBjw7NkaWdvIGRlIHZlcmlmaWNhY2nDs24nXG4gICAgICB9O1xuICAgIH1cbiAgfVxufVxuXG4vLyBTaW5nbGV0b24gcGFyYSB1c28gZW4gbGEgYXBsaWNhY2nDs25cbmV4cG9ydCBjb25zdCBhdXRoU2VydmljZSA9IG5ldyBBdXRoU2VydmljZSgpO1xuXG4vLyBGdW5jacOzbiBwYXJhIGVsIGNsaWVudGUgKGZyb250ZW5kKVxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJlZnJlc2hUb2tlbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgY29uc3QgcmVmcmVzaFRva2VuID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oJ3JlZnJlc2hUb2tlbicpO1xuICBpZiAoIXJlZnJlc2hUb2tlbikgcmV0dXJuIGZhbHNlO1xuICBcbiAgdHJ5IHtcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IGZldGNoKCcvYXBpL2F1dGgvcmVmcmVzaCcsIHtcbiAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IHJlZnJlc2hUb2tlbiB9KVxuICAgIH0pO1xuICAgIFxuICAgIGlmICghcmVzcG9uc2Uub2spIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpO1xuICAgIFxuICAgIC8vIEFjdHVhbGl6YXIgdG9rZW5zXG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2FjY2Vzc1Rva2VuJywgZGF0YS5hY2Nlc3NUb2tlbik7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2lkVG9rZW4nLCBkYXRhLmlkVG9rZW4pO1xuICAgIFxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGFsIHJlZnJlc2NhciB0b2tlbjonLCBlcnJvcik7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59Il0sIm5hbWVzIjpbInByaXNtYSIsImNvZ25pdG9TZXJ2aWNlIiwiQXV0aFNlcnZpY2UiLCJsb2dpbiIsImNyZWRlbnRpYWxzIiwiY29nbml0b1Jlc3VsdCIsInVzZXIiLCJmaW5kRmlyc3QiLCJ3aGVyZSIsImVtYWlsIiwiaW5jbHVkZSIsInJvbGUiLCJjb25zb2xlIiwibG9nIiwibmFtZSIsImNyZWF0ZSIsImRhdGEiLCJwZXJtaXNzaW9ucyIsImlkIiwic3BsaXQiLCJyb2xlSWQiLCJlcnJvciIsImxvZ291dCIsImFjY2Vzc1Rva2VuIiwicmVmcmVzaFVzZXJUb2tlbiIsInJlZnJlc2hUb2tlbiIsImdldFVzZXJCeUlkIiwidXNlcklkIiwiZmluZFVuaXF1ZSIsImNyZWF0ZVVzZXIiLCJ1c2VyRGF0YSIsInJvbGVFeGlzdHMiLCJFcnJvciIsInN1Y3Vyc2FsSWQiLCJzdWN1cnNhbEV4aXN0cyIsInViaWNhY2lvbiIsInBhc3N3b3JkIiwicmVnaXN0ZXJVc2VyIiwic3VjY2VzcyIsIm1lc3NhZ2UiLCJjb25maXJtUmVnaXN0cmF0aW9uIiwiY29kZSIsInJlc2VuZENvbmZpcm1hdGlvbkNvZGUiLCJhdXRoU2VydmljZSIsImxvY2FsU3RvcmFnZSIsImdldEl0ZW0iLCJyZXNwb25zZSIsImZldGNoIiwibWV0aG9kIiwiaGVhZGVycyIsImJvZHkiLCJKU09OIiwic3RyaW5naWZ5Iiwib2siLCJqc29uIiwic2V0SXRlbSIsImlkVG9rZW4iXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(app-pages-browser)/./src/server/services/auth/authService.ts\n"));

/***/ })

});