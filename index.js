import async from 'async';
import fs from 'fs';
import https from 'https';
import path from 'path';
const __dirname = path.resolve();

function downloadChunk(url, start, end, file) {
  const downloadedChunk = fs.createWriteStream(path.join(__dirname, file), {
    flags: 'w',
    start,
  });

  const options = {
    headers: {
      Range: `bytes=${start}-${end}`,
    },
  };
  https
    .get(url, options, (res) => {
      res.pipe(downloadedChunk);
      downloadedChunk.on('finish', () => {
        downloadedChunk.close(() => {
          console.log(`Часть файла с ${start} по ${end} байт записана успешно`);
        });
      });
    })
    .on('error', (err) => {
      fs.unlink(file, () => {
        console.error(`Ошибка записи отрезка с ${start} по ${end}`);
      });
    });
}

function divideFile(url, filename, threads) {
  https
    .get(url, (res) => {
      const contentLength = parseInt(res.headers['content-length']);
      console.log(`Размер файла: ${contentLength}`);

      const chunkSize = Math.floor(contentLength / threads);
      const chunksToDownload = [];

      for (let i = 0; i < threads; i++) {
        const start = i * chunkSize;
        const end = i === threads - 1 ? contentLength : (i + 1) * chunkSize;
        const chunkFile = `${filename}-${i + 1}`;

        chunksToDownload.push(() => {
          downloadChunk(url, start, end, chunkFile);
        });
      }

      async.parallel(chunksToDownload, (err) => {
        if (err) {
          console.error(err);
        }
      });
    })
    .on('error', (err) => {
      console.error(err);
    });
}

function checkArgs() {
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    console.error(
      'Необходимо предоставить три аргумента для запуска: url, название файла, количество потоков.'
    );
    return;
  }
  const [url, fileName, threads] = args;

  divideFile(url, fileName, threads);
}

checkArgs();
