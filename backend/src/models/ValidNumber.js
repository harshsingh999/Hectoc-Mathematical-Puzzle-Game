import mongoose from 'mongoose';

const validNumberSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true,
    unique: true
  }
});

const ValidNumber = mongoose.model('ValidNumber', validNumberSchema);
export default ValidNumber;
