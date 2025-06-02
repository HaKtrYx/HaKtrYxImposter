// server/src/utils/words.js
const words = [
  'pizza', 'guitar', 'elephant', 'rainbow', 'computer', 'butterfly',
  'mountain', 'chocolate', 'dinosaur', 'telescope', 'watermelon', 'astronaut',
  'volcano', 'penguin', 'lighthouse', 'saxophone', 'hamburger', 'kangaroo',
  'submarine', 'fireworks', 'pineapple', 'helicopter', 'crocodile', 'basketball'
];

const getRandomWord = () => {
  return words[Math.floor(Math.random() * words.length)];
};

module.exports = { words, getRandomWord };