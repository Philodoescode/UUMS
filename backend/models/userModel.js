
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {

    fullName: {
      type: String,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      match: [/.+\@.+\..+/, 'Please fill a valid email address'],
    },

    password: {
      type: String,
      required: true,
    },


    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {

    timestamps: true,
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;