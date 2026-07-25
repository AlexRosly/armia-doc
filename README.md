# armia-doc

Automations process to create documents

# start worker for call queue

Как запускать worker на сервере
Отдельным процессом через PM2.

Например:
bash

pm2 start src/queue/generationWorker.js --name armiadoc-worker
pm2 save
Проверить:
bash

pm2 list
pm2 logs armiadoc-worker

Где запускать worker локально
Отдельной консолью:
bash

node src/queue/generationWorker.js
А API в другой консоли:
bash

npm run dev
или как запускается backend.
