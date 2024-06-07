// const express = require('express');
// const { createServer } = require('node:http');
// const { join } = require('node:path');
// const { Server } = require('socket.io');
// const { PrismaClient } = require('@prisma/client');

// async function main() {
//   const prisma = new PrismaClient();

//   const app = express();
//   const server = createServer(app);
//   const io = new Server(server, {
//     connectionStateRecovery: {}
//   });

//   app.get('/', (req, res) => {
//     res.sendFile(join(__dirname, 'index.html'));
//   });

//   io.on('connection', (socket) => {
//     socket.on('chat message', async (msg) => {
//       let result;
//       try {
//         // store the message in the database
//         result = await prisma.message.create({
//           data: {
//             content: msg,
//           },
//         });
//       } catch (e) {
//         // TODO handle the failure
//         console.error('Database insert error:', e);
//         return;
//       }
//       // include the offset with the message
//       io.emit('chat message', msg, result.id);
//     });
//   });

//   server.listen(3000, () => {
//     console.log('server running at http://localhost:3000');
//   });
// }

// main().catch((err) => {
//   console.error('Error starting the application:', err);
// });


// const express = require('express');
// const { createServer } = require('node:http');
// const { join } = require('node:path');
// const { Server } = require('socket.io');
// const { PrismaClient } = require('@prisma/client');

// async function main() {
//   const prisma = new PrismaClient();

//   const app = express();
//   const server = createServer(app);
//   const io = new Server(server, {
//     connectionStateRecovery: {}
//   });

//   app.get('/', (req, res) => {
//     res.sendFile(join(__dirname, 'index.html'));
//   });

//   io.on('connection', async (socket) => {
//     try {
//       // Fetch and send stored messages to the client when it connects
//       const messages = await prisma.message.findMany({
//         orderBy: { id: 'asc' }
//       });
//       socket.emit('initialize', messages);
//     } catch (e) {
//       console.error('Database fetch error:', e);
//     }

//     socket.on('chat message', async (msg) => {
//       let result;
//       try {
//         // Store the message in the database
//         result = await prisma.message.create({
//           data: {
//             content: msg,
//           },
//         });
//       } catch (e) {
//         // Handle the failure
//         console.error('Database insert error:', e);
//         return;
//       }
//       // Include the offset with the message
//       io.emit('chat message', { id: result.id, content: msg });
//     });
//   });

//   server.listen(3000, () => {
//     console.log('server running at http://localhost:3000');
//   });
// }

// main().catch((err) => {
//   console.error('Error starting the application:', err);
// });


const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const { ApolloServer, gql } = require('apollo-server-express'); // Change import

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {}
  });

  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
  });

  // Define GraphQL type definitions (schema)
  const typeDefs = gql`
    type Message {
      id: Int!
      content: String!
    }

    type Query {
      messages: [Message!]!
    }

    type Mutation {
      addMessage(content: String!): Message!
    }
  `;

  // Define GraphQL resolvers
  const resolvers = {
    Query: {
      messages: async () => {
        return prisma.message.findMany();
      },
    },
    Mutation: {
      addMessage: async (_, { content }) => {
        const message = await prisma.message.create({
          data: {
            content,
          },
        });
        io.emit('chat message', { id: message.id, content }); // Broadcast message to all clients
        return message;
      },
    },
  };

  // Create Apollo Server instance
  const apolloServer = new ApolloServer({
    typeDefs,
    resolvers,
  });

  // Apply Apollo Server middleware to express app
  await apolloServer.start(); // Ensure Apollo Server is started before applying middleware
  apolloServer.applyMiddleware({ app });

  io.on('connection', async (socket) => {
    try {
      // Fetch and send stored messages to the client when it connects
      const messages = await prisma.message.findMany({
        orderBy: { id: 'asc' }
      });
      socket.emit('initialize', messages);
    } catch (e) {
      console.error('Database fetch error:', e);
    }

    socket.on('chat message', async (msg) => {
      let result;
      try {
        // Store the message in the database
        result = await prisma.message.create({
          data: {
            content: msg,
          },
        });
      } catch (e) {
        // Handle the failure
        console.error('Database insert error:', e);
        return;
      }
      // Include the offset with the message
      io.emit('chat message', { id: result.id, content: msg });
    });
  });

  server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
  });
}

main().catch((err) => {
  console.error('Error starting the application:', err);
});
