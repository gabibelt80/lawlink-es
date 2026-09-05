const { getServerSession } = require("next-auth"); console.log("Sesión actual:", JSON.stringify(await getServerSession()));
