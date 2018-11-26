import mongoose from 'mongoose';

const {
  MONGO_INITDB_ROOT_USERNAME: USERNAME,
  MONGO_INITDB_ROOT_PASSWORD: PASSWORD,
  MONGO_INITDB_DATABASE: DATABASE,
} = process.env;

console.log(
  USERNAME,
  PASSWORD,
  DATABASE,
)

mongoose.connect(
  `mongodb://${USERNAME}:${PASSWORD}@localhost/${DATABASE}`,
  {
    useNewUrlParser: true,
  }
);
