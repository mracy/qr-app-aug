const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const resolvers = {
  Query: {
    sessions: async () => await prisma.session.findMany(),
    session: async (_, { sessionId }) => await prisma.session.findUnique({ where: { sessionId } }),
    qrCodes: async () => await prisma.qRCode.findMany(),
    qrCode: async (_, { id }) => await prisma.qRCode.findUnique({ where: { id } }),
  },
  Mutation: {
    createSession: async (_, args) => {
      const newSession = await prisma.session.create({ data: args });
      return newSession;
    },
    createQRCode: async (_, args) => {
      const newQRCode = await prisma.qRCode.create({ data: args });
      return newQRCode;
    }
  }
};

module.exports = resolvers;
