const CacheKey = 'cache-v1';

const initCache = () => {
    // Кешируем статику при монтировании Service Worker
    return caches.open(CacheKey).then((cache) => {
        return cache.addAll([
            './index.html',
            './page1.html',
            './page2.html',
            './page3.html',
        ]);
    }, (error) => {
        console.log(error)
    });
};

const tryNetwork = (req, timeout) => {
    return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(reject, timeout);
        // Пытаемся получить данные по сети, если не получается reject-им промис
        fetch(req).then((res) => {
            clearTimeout(timeoutId);
            const responseClone = res.clone();
            // Обновляем кеш
            caches.open(CacheKey).then((cache) => {
                cache.put(req, responseClone)
            })
            resolve(res);
        }, reject);
    });
};

const getFromCache = (req) => {
    console.log('Нет интернета, либо не получилось получить запрос с сервера, отдаем кеш')
    return caches.open(CacheKey).then((cache) => {
        return cache.match(req).then((result) => {
            return result || Promise.reject('no-match');
        });
    });
};

self.addEventListener('install', (e) => {
    console.log('Установлен');
    e.waitUntil(initCache());
});

self.addEventListener('activate', (e) => {
    console.log('Активирован');
    e.waitUntil(
        caches.keys().then((keyList) => {
            // Пробегаемся по всем ключам, если ключ изменился удаляем ненужный кеш
            return Promise.all(keyList.map((key) => {
                if (key !== CacheKey) {
                    return caches.delete(key);
                }
            }));
        })
    );
});

self.addEventListener('fetch', (e) => {
    console.log('Происходит запрос на сервер');
    e.respondWith(tryNetwork(e.request, 4000).catch(() => getFromCache(e.request)));
});