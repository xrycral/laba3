function memoize(fn, options = {}) {
  let cache = {};
  let queue = [];

  const limit = options.limit || Infinity;
  const policy = options.policy || 'LRU';
  const ttl = options.ttl || null;

  return function (...args) {
    const key = JSON.stringify(args);
    const now = Date.now();

    if (cache[key] !== undefined) {
      if (ttl && now - cache[key].createdAt > ttl) {
        delete cache[key];
        queue = queue.filter((k) => k !== key);
      } else {
        cache[key].uses += 1;
        cache[key].lastUsed = now;
        return cache[key].value;
      }
    }

    const result = fn(...args);

    if (queue.length >= limit) {
      let keyToRemove;

      if (typeof policy === 'function') {
        keyToRemove = policy(cache, queue);
      } else if (policy === 'LRU') {
        keyToRemove = queue.reduce((a, b) =>
          cache[a].lastUsed < cache[b].lastUsed ? a : b
        );
      } else if (policy === 'LFU') {
        keyToRemove = queue.reduce((a, b) =>
          cache[a].uses < cache[b].uses ? a : b
        );
      }

      if (keyToRemove) {
        delete cache[keyToRemove];
        queue = queue.filter((k) => k !== keyToRemove);
      }
    }

    cache[key] = {
      value: result,
      uses: 1,
      lastUsed: now,
      createdAt: now,
    };
    queue.push(key);

    return result;
  };
}

const slowMultiply = (a, b) => {
  console.log(`[Calculating] ${a} * ${b}...`);
  return a * b;
};

const lruMemo = memoize(slowMultiply, { limit: 2, policy: 'LRU', ttl: 2000 });
console.log('--- LRU ---');
console.log(lruMemo(2, 2));
console.log(lruMemo(2, 2));

const lfuMemo = memoize(slowMultiply, { limit: 2, policy: 'LFU' });
console.log('\n--- LFU ---');
console.log(lfuMemo(3, 3));
console.log(lfuMemo(3, 3));
console.log(lfuMemo(4, 4));

const customMemo = memoize(slowMultiply, {
  limit: 2,
  policy: (cache, queue) => queue[0],
});
console.log('\n--- Custom Policy (FIFO) ---');
console.log(customMemo(5, 5));
console.log(customMemo(6, 6));
console.log(customMemo(7, 7));

setTimeout(() => {
  console.log('\n--- TTL expired ---');
  console.log(lruMemo(2, 2));
}, 3000);
