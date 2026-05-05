import gql from 'graphql-tag';

export const typeDefs = gql`
  type User {
    id: ID!
    username: String!
    email: String!
    createdAt: String!
  }

  type Message {
    id: ID!
    content: String!
    senderId: ID!
    roomId: ID!
    createdAt: String!
    sender: User!
  }

  type Room {
    id: ID!
    name: String!
    members: [User!]!
    messages: [Message!]!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    me: User
    rooms: [Room!]!
    room(id: ID!): Room
    messages(roomId: ID!): [Message!]!
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createRoom(name: String!): Room!
    sendMessage(roomId: ID!, content: String!): Message!
    joinRoom(roomId: ID!): Room!
  }
`;