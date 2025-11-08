/*
 * Модуль отримання JSON звітності підприємств
 * Підтримує звітність мікро, середніх та великих підприємств
 * XML файли мають бути розміщені на відповідних шляхах
 */

const fs = require('fs');
const path = require('path');
const { getFinStatement } = require('./xml-parser');

// ============================================================================
// КОНСТАНТИ
// ============================================================================

const CONFIG = {
  REGIONS: ['26', '46', '61', '21'],
  // Єдиний регекс для всіх типів файлів
  FILE_REGEX: /^(\d{8,9})_.*?(S0100\d{3})?.*?_(\d{4}-\d{2}-\d{2}) \d{2}_\d{2}_\d{2}\.xml$/i,
  FOLDERS: {
    MICRO: path.join(__dirname, '../data'),
    F1: path.join(__dirname, '../data/F1'),
    F2: path.join(__dirname, '../data/F2'),
  },
  BATCH_SIZE: 50, // Розмір пакету для обробки файлів
};

// ============================================================================
// УТИЛІТИ ДЛЯ РОБОТИ З ФАЙЛАМИ
// ============================================================================

/**
 * Перевіряє чи файл належить до вказаних регіонів
 * @param {string} filename - Назва файлу
 * @returns {boolean}
 */
function isRegionAllowed(filename) {
  const regionCode = filename.slice(9, 11);
  return CONFIG.REGIONS.includes(regionCode);
}

/**
 * Читає файли з папки та фільтрує за регіонами
 * @param {string} folderPath - Шлях до папки
 * @returns {string[]} - Масив відфільтрованих файлів
 */
function readAndFilterFiles(folderPath) {
  if (!fs.existsSync(folderPath)) {
    console.warn(`Папка не знайдена: ${folderPath}`);
    return [];
  }

  const files = fs.readdirSync(folderPath);
  return files.filter(isRegionAllowed);
}

/**
 * Зберігає результати у JSON файл
 * @param {string} jsonFileName - Шлях до вихідного файлу
 * @param {Array} data - Дані для збереження
 */
function saveToJson(jsonFileName, data) {
  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFileSync(jsonFileName, jsonData, 'utf8');
  console.log(`Результат збережено у: ${jsonFileName}`);
}

/**
 * Парсить назву файлу та повертає метадані
 * @param {string} filename - Назва файлу
 * @param {boolean} needFormCode - Чи потрібен код форми
 * @returns {Object|null} - Об'єкт з метаданими або null
 */
function parseFileName(filename, needFormCode = false) {
  const match = filename.match(CONFIG.FILE_REGEX);
  if (!match) {
    console.log(`DEBUG parseFileName: Регекс не співпав для "${filename}"`);
    return null;
  }

  const [, companyCode, formCode, date] = match;
  
  console.log(`DEBUG parseFileName: "${filename}" -> companyCode=${companyCode}, formCode=${formCode}, date=${date}, needFormCode=${needFormCode}`);

  // Для середніх/великих підприємств перевіряємо наявність коду форми
  if (needFormCode && !formCode) {
    console.log(`DEBUG parseFileName: Потрібен formCode, але його немає`);
    return null;
  }

  return { companyCode, formCode, date };
}

// ============================================================================
// ОБРОБКА ФАЙЛІВ
// ============================================================================

/**
 * Обробляє один файл звітності
 * @param {string} filePath - Повний шлях до файлу
 * @returns {Promise<Object|null>} - Об'єкт звітності або null
 */
async function processStatementFile(filePath) {
  try {
    return await getFinStatement(filePath);
  } catch (error) {
    console.error(`Помилка обробки файлу ${path.basename(filePath)}:`, error.message);
    return null;
  }
}

/**
 * Обробляє масив файлів пакетами для уникнення EMFILE помилки
 * @param {Array} items - Масив елементів для обробки
 * @param {Function} processFn - Async функція обробки одного елемента
 * @param {number} batchSize - Розмір пакету
 * @returns {Promise<Array>} - Масив результатів
 */
async function processBatch(items, processFn, batchSize = CONFIG.BATCH_SIZE) {
  const results = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map((item) => processFn(item)));
    results.push(...batchResults);

    // Логування прогресу
    const processed = Math.min(i + batchSize, items.length);
    console.log(`Оброблено: ${processed}/${items.length}`);
  }

  return results;
}

/**
 * Логує статистику обробки
 * @param {number} success - Кількість успішно оброблених
 * @param {number} errors - Кількість помилок
 */
function logStatistics(success, errors) {
  console.log(`✓ Успішно оброблено: ${success}`);
  if (errors > 0) {
    console.warn(`✗ Помилок обробки: ${errors}`);
  }
}

// ============================================================================
// МІКРОПІДПРИЄМСТВА
// ============================================================================

/**
 * Оновлює карту файлів мікропідприємств
 * @param {Object} latestFiles - Карта останніх файлів
 * @param {string} companyCode - Код компанії
 * @param {string} date - Дата звіту
 * @param {string} filename - Назва файлу
 */
function updateLatestFile(latestFiles, companyCode, date, filename) {
  const existing = latestFiles[companyCode];

  if (!existing || existing.date < date) {
    latestFiles[companyCode] = { file: filename, date };
  }
}

/**
 * Створює список останніх звітностей мікропідприємств
 * @param {string|null} minDate - Мінімальна дата у форматі YYYY-MM-DD
 * @returns {string[]} - Масив назв файлів
 */
function createMicroFilesMap(minDate = null) {
  const latestFiles = {};
  const filteredFiles = readAndFilterFiles(CONFIG.FOLDERS.MICRO);

  for (const file of filteredFiles) {
    const metadata = parseFileName(file, false);
    if (!metadata) continue;

    const { companyCode, date } = metadata;
    if (minDate && date <= minDate) continue;

    updateLatestFile(latestFiles, companyCode, date, file);
  }

  return Object.values(latestFiles).map((entry) => entry.file);
}

/**
 * Створює JSON файл зі звітностями мікропідприємств
 * @param {string} jsonFileName - Шлях до вихідного JSON файлу
 * @param {string|null} minDate - Мінімальна дата звітності (опціонально)
 */
async function createJsonMicroStatement(jsonFileName, minDate = null) {
  const filesMap = createMicroFilesMap(minDate);

  if (filesMap.length === 0) {
    console.log('Не знайдено файлів мікропідприємств для обробки');
    return;
  }

  console.log(`Знайдено файлів мікропідприємств: ${filesMap.length}`);

  const results = await processBatch(filesMap, (file) =>
    processStatementFile(path.join(CONFIG.FOLDERS.MICRO, file))
  );

  const statements = results
    .filter((result) => result.status === 'fulfilled' && result.value !== null)
    .map((result) => result.value);

  const errors = results.length - statements.length;
  logStatistics(statements.length, errors);
  saveToJson(jsonFileName, statements);
}

// ============================================================================
// СЕРЕДНІ ТА ВЕЛИКІ ПІДПРИЄМСТВА
// ============================================================================

/**
 * Оновлює карту звітів середніх/великих підприємств
 * @param {Object} reportsMap - Карта звітів
 * @param {string} companyCode - Код компанії
 * @param {string} date - Дата звіту
 * @param {string} formType - Тип форми (F1 або F2)
 * @param {string} filename - Назва файлу
 */
function updateReportsMap(reportsMap, companyCode, date, formType, filename) {
  const existing = reportsMap[companyCode];

  if (!existing) {
    reportsMap[companyCode] = { date, [formType]: filename };
  } else if (existing.date < date) {
    reportsMap[companyCode] = { date, [formType]: filename };
  } else if (existing.date === date) {
    existing[formType] = filename;
  }
}

/**
 * Обробляє файли з вказаної папки для середніх/великих підприємств
 * @param {string} formType - Тип форми (F1 або F2)
 * @param {string} folderPath - Шлях до папки
 * @param {Object} reportsMap - Карта звітів для оновлення
 * @param {string|null} minDate - Мінімальна дата звітності
 */
function processFolder(formType, folderPath, reportsMap, minDate) {
  const filteredFiles = readAndFilterFiles(folderPath);
  
  console.log(`DEBUG ${formType}: Знайдено файлів після фільтрації: ${filteredFiles.length}`);

  for (const file of filteredFiles) {
    const metadata = parseFileName(file, true); // Вимагаємо код форми
    if (!metadata) {
      console.log(`DEBUG ${formType}: Файл НЕ розпарсився: ${file}`);
      continue;
    }

    const { companyCode, date } = metadata;
    if (minDate && date <= minDate) continue;

    updateReportsMap(reportsMap, companyCode, date, formType, file);
  }
  
  console.log(`DEBUG ${formType}: Додано до карти: ${Object.keys(reportsMap).length} компаній`);
}

/**
 * Фільтрує карту звітів, залишаючи тільки записи з обома формами
 * @param {Object} reportsMap - Карта звітів
 * @returns {Object} - Відфільтрована карта
 */
function filterCompleteReports(reportsMap) {
  const filtered = {};

  for (const [code, entry] of Object.entries(reportsMap)) {
    if (entry.F1 && entry.F2) {
      filtered[code] = {
        F1: entry.F1,
        F2: entry.F2,
      };
    }
  }

  return filtered;
}

/**
 * Створює об'єкт з останніми звітностями середніх/великих підприємств
 * @param {string|null} minDate - Мінімальна дата у форматі YYYY-MM-DD
 * @returns {Object} - Карта звітів {companyCode: {F1: filename, F2: filename}}
 */
function createMiddleFilesMap(minDate = null) {
  const reportsMap = {};

  processFolder('F1', CONFIG.FOLDERS.F1, reportsMap, minDate);
  processFolder('F2', CONFIG.FOLDERS.F2, reportsMap, minDate);

  return filterCompleteReports(reportsMap);
}

/**
 * Створює JSON файл зі звітностями середніх/великих підприємств
 * @param {string} jsonFileName - Шлях до вихідного JSON файлу
 * @param {string|null} minDate - Мінімальна дата звітності (опціонально)
 */
async function createJsonMiddleStatement(jsonFileName, minDate = null) {
  const filesMap = createMiddleFilesMap(minDate);
  const companies = Object.entries(filesMap);

  if (companies.length === 0) {
    console.log('Не знайдено файлів середніх/великих підприємств для обробки');
    return;
  }

  console.log(`Знайдено компаній середніх/великих підприємств: ${companies.length}`);

  const results = await processBatch(companies, async ([companyCode, files]) => {
    const f1Path = path.join(CONFIG.FOLDERS.F1, files.F1);
    const f2Path = path.join(CONFIG.FOLDERS.F2, files.F2);

    const [f1, f2] = await Promise.all([
      processStatementFile(f1Path),
      processStatementFile(f2Path),
    ]);

    if (f1 && f2) {
      return { ...f1, ...f2 };
    }
    throw new Error(`Неповні дані для компанії ${companyCode}`);
  });

  const statements = results
    .filter((result) => result.status === 'fulfilled' && result.value !== null)
    .map((result) => result.value);

  const errors = results.length - statements.length;
  logStatistics(statements.length, errors);
  saveToJson(jsonFileName, statements);
}

// ============================================================================
// ЕКСПОРТ
// ============================================================================

module.exports = {
  createJsonMicroStatement,
  createJsonMiddleStatement,
  createMicroFilesMap,
  createMiddleFilesMap,
  CONFIG,
};

// ============================================================================
// ПРИКЛАД ВИКОРИСТАННЯ
// ============================================================================


(async () => {
  // Мікропідприємства - всі файли
//   console.time('micro');
//   await createJsonMicroStatement('MIC_12_2024.json');
//   console.timeEnd('micro');

  // Мікропідприємства - з фільтром по даті
//   await createJsonMicroStatement('MIC_12_2024.json', '2025-08-01');

  // Середні та великі підприємства - всі файли
  console.time('middle');
  await createJsonMiddleStatement('MIDDLE_12_2024.json');
  console.timeEnd('middle');

  // Середні та великі підприємства - з фільтром по даті
//   await createJsonMiddleStatement('MIDDLE_12_2024.json', '2025-08-01');
})();
