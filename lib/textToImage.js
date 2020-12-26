/* eslint-disable prefer-destructuring */
/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
const fs = require('fs');
const path = require('path');
const Canvas = require('canvas');

const defaults = {
  debug: false,
  maxWidth: 400,
  fontSize: 18,
  lineHeight: 28,
  margin: 10,
  bgColor: '#fff',
  textColor: '#000',
  fontFamily: 'Helvetica',
  fontWeight: 'normal',
  customHeight: 0,
  textAlign: 'left',
  localFontName: null,
  localFontPath: null,
  offsetX: 0,
  offsetY: 0,
  strokeColor: '#000',
  lineWidth: 10,
  maxHeight: null,
  lineHeightRatio: 1,
};

const calculateFontSize = (
  textContext,
  words,
  maxWidth,
  maxHeight,
  startingFontSize,
  fontWeight,
  fontFamily,
  lineHeightRatio,
) => {
  let fontSize = startingFontSize;
  let done = false;
  const maxTries = 1000;
  let i = 0;
  const wordCount = words.length;
  const tried = {};

  while (!done && i < maxTries) {
    let lineCount = 0;
    let line = '';
    const lineHeight = Math.round(fontSize * lineHeightRatio);
    // eslint-disable-next-line no-param-reassign
    textContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    for (let n = 0; n < wordCount; n += 1) {
      const word = words[n];

      const testLine = `${line}${word} `;
      const testLineWidth = textContext.measureText(testLine).width;

      if (testLineWidth > maxWidth && n > 0) {
        line = `${word} `;
        lineCount++;
      } else {
        line = testLine;
      }
    }

    const height = ++lineCount * lineHeight;

    if (height > maxHeight) {
      tried[fontSize] = true;
      fontSize--;
    } else if (height === maxHeight || tried[fontSize + 1]) {
      done = true;
    } else {
      tried[fontSize] = true;
      fontSize++;
    }

    i++;
  }

  return {
    fontSize,
    lineHeight: Math.round(fontSize * lineHeightRatio),
  };
};

const createTextData = (
  text,
  maxWidth,
  fontSize,
  lineHeight,
  bgColor,
  textColor,
  highlightColor,
  fontFamily,
  fontWeight,
  customHeight,
  textAlign,
  localFontPath,
  localFontName,
  offsetX,
  offsetY,
  maxHeight,
  strokeColor,
  lineWidth,
  lineHeightRatio,
) => {
  // register a custom font
  if (localFontPath && localFontName) {
    Canvas.registerFont(localFontPath, { family: localFontName });
  }

  // create a tall context so we definitely can fit all text
  const textCanvas = Canvas.createCanvas(maxWidth, 1000);
  const textContext = textCanvas.getContext('2d');

  // set the text alignment and start position
  let textX = offsetX;
  let textY = 0;
  if (['center'].includes(textAlign.toLowerCase())) {
    textX = maxWidth / 2;
  }
  if (['right', 'end'].includes(textAlign.toLowerCase())) {
    textX = maxWidth;
  }
  textContext.textAlign = textAlign;

  // make background the color passed in
  if (bgColor) {
    textContext.fillStyle = bgColor;
    textContext.fillRect(0, 0, textCanvas.width, textCanvas.height);
  }

  // split the text into words
  let words = text.split(' ');
  const highlightedWords = {};
  words.forEach((word, i) => {
    if (/\|.+\|/.test(word)) {
      highlightedWords[i] = {
        text: word.replace(/\|(.+)\|.*/g, '$1'),
        x: 0,
        y: 0,
      };
    }
  });

  words = words.map(word => word.replace(/\|/g, ''));
  let wordCount = words.length;

  // the start of the first line
  let line = '';
  const addNewLines = [];

  if (maxHeight) {
    const calculated = calculateFontSize(
      textContext,
      words,
      maxWidth - 2 * offsetX,
      maxHeight - 2 * offsetY,
      fontSize,
      fontWeight,
      fontFamily,
      lineHeightRatio,
    );

    lineHeight = calculated.lineHeight;
    fontSize = calculated.fontSize;
  }

  // make text
  textContext.fillStyle = textColor;
  textContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  textContext.textBaseline = 'top';
  textContext.strokeStyle = strokeColor;
  textContext.lineWidth = lineWidth;

  for (let n = 0; n < wordCount; n += 1) {
    let word = words[n];

    if (/\n/.test(words[n])) {
      const parts = words[n].split('\n');
      // use the first word before the newline(s)
      word = parts.shift();
      // mark the next word as beginning with newline
      addNewLines.push(n + 1);
      // return the rest of the parts to the words array at the same index
      words.splice(n + 1, 0, parts.join('\n'));
      wordCount += 1;
    }

    if (highlightedWords[n]) {
      highlightedWords[n].x = textX + textContext.measureText(line).width;
      highlightedWords[n].y = textY;
    }

    // append one word to the line and see
    // if its width exceeds the maxWidth
    const testLine = `${line}${word} `;
    const testLineWidth = textContext.measureText(testLine).width + offsetX;

    // if the line is marked as starting with a newline
    // OR if the line is too long, add a newline
    if (addNewLines.indexOf(n) > -1 || (testLineWidth > maxWidth && n > 0)) {
      // if the line exceeded the width with one additional word
      // just paint the line without the word
      textContext.strokeText(line, textX, textY);
      textContext.fillText(line, textX, textY);

      // start a new line with the last word
      // and add the following (if this word was a newline word)
      line = `${word} `;

      // move the pen down
      textY += lineHeight;

      if (highlightedWords[n]) {
        highlightedWords[n].x = textX;
        highlightedWords[n].y += lineHeight;
      }
    } else {
      // if not exceeded, just continue
      line = testLine;
    }
  }
  // paint the last line
  textContext.strokeText(line, textX, textY);
  textContext.fillText(line, textX, textY);

  textContext.fillStyle = highlightColor || textColor;
  Object.values(highlightedWords).forEach(word => {
    textContext.fillText(word.text, word.x, word.y);
  });

  const height = customHeight || textY + lineHeight + offsetX;

  return textContext.getImageData(0, 0, maxWidth, height);
};

const createCanvas = (content, conf) => {
  const textData = createTextData(
    content,
    conf.maxWidth - conf.margin,
    conf.fontSize,
    conf.lineHeight,
    conf.bgColor,
    conf.textColor,
    conf.highlightColor,
    conf.fontFamily,
    conf.fontWeight,
    conf.customHeight,
    conf.textAlign,
    conf.localFontPath,
    conf.localFontName,
    conf.offsetX,
    conf.offsetY,
    conf.maxHeight,
    conf.strokeColor,
    conf.lineWidth,
    conf.lineHeightRatio,
  );

  const canvas = Canvas.createCanvas(
    conf.maxWidth,
    textData.height + conf.margin * 2,
  );
  const ctx = canvas.getContext('2d');
  ctx.globalAlpha = 1;

  if (conf.bgColor) {
    ctx.fillStyle = conf.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.putImageData(textData, conf.margin, conf.margin);

  return canvas;
};

const generateImage = (content, config) => {
  const conf = { ...defaults, ...config };
  const canvas = createCanvas(content, conf);
  const dataUrl = canvas.toDataURL();

  if (conf.debug) {
    const fileName =
      conf.debugFilename ||
      `${new Date().toISOString().replace(/[\W.]/g, '')}.png`;

    return new Promise(resolve => {
      const pngStream = canvas.createPNGStream();
      const out = fs.createWriteStream(path.join(process.cwd(), fileName));
      out.on('close', () => {
        resolve(dataUrl);
      });
      pngStream.pipe(out);
    });
  }

  return Promise.resolve(dataUrl);
};

const generateImageSync = (content, config) => {
  const conf = { ...defaults, ...config };
  const canvas = createCanvas(content, conf);
  const dataUrl = canvas.toDataURL();
  if (conf.debug) {
    const fileName =
      conf.debugFilename ||
      `${new Date().toISOString().replace(/[\W.]/g, '')}.png`;
    fs.writeFileSync(fileName, canvas.toBuffer());
    return dataUrl;
  }
  return dataUrl;
};

module.exports = {
  generate: generateImage,
  generateSync: generateImageSync,
};
