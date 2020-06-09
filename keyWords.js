const getKeyWords = () => {
  const indexes = [];
  const min = 0;
  const max = keyWords.length - 1;

  while (indexes.length < 3) {
    const index = Math.floor(Math.random() * (max - min + 1)) + min;
    if (!indexes.includes(index)) {
      indexes.push(index);
    }
  }

  return indexes;
};

const keyWords = [
  "Cobra",
  "Unicorn",
  "Grass",
  "Sea",
  "Needle in a haystack",
  "Blade",
  "Door",
  "Cinema",
  "Teddy bear",
  "Ruby",
  "Encyclopedia",
  "Guitar",
  "Musician",
  "Emperor",
  "Philosopher's stone",
  "Yoga"
];

module.exports = { keyWords, getKeyWords };
