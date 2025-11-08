class FinancialCalculator {
  constructor(data) {
    this.data = data;
    // Визначаємо тип звітності за кодом форми
    this.isFullReport = data.FС === "S0100115";
    this.isShortReport = data.FС === "S0110014";
    //коефіцієнт приведення до року
    this.multiplierYear = 12/Number(this.data.M);
  }

  /**
   * Чистий дохід від реалізації продукції (товарів, робіт, послуг)
   * Рядок 2000 форми №2 (Звіт про фінансові результати)
   */
  getNetRevenue() {
    return this.data.R2000G3 || 0;
  }

  /**
   * Власний капітал
   * Рядок 1495 форми №1 (Баланс)
   */
  getEquity() {
    return this.data.R1495G4 || 0;
  }

  /**
   * Короткострокові кредити банків
   * Рядок 1600 форми №1
   */
  getShortTermLoans() {
    return this.data.R1600G4 || 0;
  }

  /**
   * Довгострокові кредити банків
   * Рядок 1510 форми №1
   */
  getLongTermLoans() {
    return this.isFullReport ? this.data.R1510G4 || 0 : this.data.R1595G4 || 0;
  }

  

  /**
   * Інші довгострокові зобов'язання
   * Рядок 1515 (інші довгострокові поточні зобов'язання)
   */
  getOtherLongTermObligations() {
    return this.data.R1515G4 || 0;
  }

  /**
   * Інші поточні зобов'язання
   * Рядок 1690 (інші поточні зобов'язання)
   */
  getOtherObligations() {
    return this.data.R1690G4 || 0;
  }

  /**
   * Частка власного капіталу, %
   * (Власний капітал / Валюта балансу) * 100
   */
  getEquityRatio() {
    const equity = this.getEquity();
    const totalAssets = this.data.R1300G4 || 0;
    
    if (totalAssets === 0) return 0;
    return (equity / totalAssets) * 100;
  }

  /**
   * Чистий прибуток (збиток)
   * Рядок 2350 форми №2
   */
  getNetProfit() {
    return this.data.R2350G3 || 0;
  }

  /**
   * Динаміка активів
   * Різниця між поточним та попереднім періодом (Рядок 1300)
   */
  getAssetsDynamics() {
    const currentAssets = this.data.R1300G4 || 0;
    const previousAssets = this.data.R1300G3 || 0;
    return currentAssets - previousAssets;
  }

  /**
   * Амортизація
   * Рядок 2240 форми №2
   */
  getDepreciation() {
    if (this.isFullReport){
      return this.data.R2515G3 || 0
    }
    return this.data.R1012G4 - this.data.R1012G3;
  }

  /**
   * Операційний прибуток (збиток)
   * Рядок 2290 форми №2
   */
  getOperatingProfit() {
    if (this.isFullReport) {
      return this.data.R2190G3 || this.data.R2195G3;
    } 

    return this.data.R2000G3 + this.data.R2120G3-this.data.R2050G3-this.data.R2180G3
    
  }

  /**
   * Фінансові витрати
   * Рядок 2250 форми №2
   */
  getFinancialExpenses() {
    return Math.abs(this.data.R2250G3 || 0);
  }

  /**
   * Інші операційні витрати
   * Рядок 2180 форми №2
   */
  getOtherOperatingExpenses() {
    return Math.abs(this.data.R2180G3 || 0);
  }

  /**
   * Інші операційні доходи
   * Рядок 2120 форми №2
   */
  getOtherOperatingIncome() {
    return this.data.R2120G3 || 0;
  }

  /**
   * EBITDA (прибуток до вирахування відсотків, податків та амортизації)
   * Для повної звітності: EBITDA = Операційний прибуток + Амортизація
   * Для скороченої звітності: EBITDA = Чистий дохід - Собівартість - Адмін витрати - 
   *                                      Збут витрати + Інші операційні доходи - Інші операційні витрати
   */
  getEBITDA() {
    const operatingProfit = this.getOperatingProfit();  
    const depreciation = this.getDepreciation();   

      // Валідація: амортизація не може бути від'ємною
    const validDepreciation = depreciation >= 0 ? depreciation : 0;
    
    return operatingProfit + validDepreciation;    
  }

  /**
   * Грошові кошти та їх еквіваленти
   * Рядок 1165 форми №1
   */
  getCashAndEquivalents() {
    return this.data.R1165G4 || 0;
  }

  /**
   * Чистий фінансовий борг
   * ЧФБ = Довгострокові кредити + Короткострокові кредити - Грошові кошти
   */
  getNetDebt() {
    const longTermLoans = this.getLongTermLoans();
    const shortTermLoans = this.getShortTermLoans();
    const cash = this.getCashAndEquivalents();
    const accPayableLT = this.getAccountsPayableLongTermObligations();
    let result = longTermLoans + shortTermLoans + accPayableLT - cash;
    if (this.isFullReport) {
      const otherFinancial = this.getOtherLongTermObligations();
      result = result + otherFinancial;
    }
    return result;
  }

  /**
   * Співвідношення чистого фінансового боргу до показника EBITDA (Debt/EBITDA)
   */
  getDebtToEBITDA() {
    const netDebt = this.getNetDebt();
    const ebitda = this.getEBITDA();
    const ebitdaYear = ebitda*this.multiplierYear;//приведено до року
    
    if (ebitda === 0 || ebitda === null) return 0;
    return netDebt / ebitdaYear;
  }

  /**
   * Співвідношення показника EBITDA до фінансових витрат (Interest Coverage Ratio)
   */
  getEBITDAToFinancialExpenses() {
    const ebitda = this.getEBITDA();
    const financialExpenses = this.getFinancialExpenses();
    const ebitdaYear = ebitda*this.multiplierYear;//приведено до року
    
    if (financialExpenses === 0) return 0;
    return ebitdaYear / financialExpenses;
  }

  /**
   * Оборотні активи
   * Рядок 1195 форми №1
   */
  getCurrentAssets() {
    return this.data.R1195G4 || 0;
  }

  /**
   * Поточні зобов'язання
   * Рядок 1695 форми №1
   */
  getCurrentLiabilities() {
    return this.data.R1695G4 || 0;
  }

  /**
   * Показник загальної ліквідності (коефіцієнт покриття)
   * Оборотні активи / Поточні зобов'язання
   */
  getCurrentRatio() {
    const currentAssets = this.getCurrentAssets();
    const currentLiabilities = this.getCurrentLiabilities();
    
    if (currentLiabilities === 0) return null;
    return currentAssets / currentLiabilities;
  }

  /**
   * Показник абсолютної ліквідності
   * Грошові кошти / Поточні зобов'язання
   */
  getCashRatio() {
    const cash = this.getCashAndEquivalents();
    const currentLiabilities = this.getCurrentLiabilities();
    
    if (currentLiabilities === 0) return null;
    return cash / currentLiabilities;
  }

  /**
   * Дебіторська заборгованість
   * Рядок 1125 форми №1
   */
  getAccountsReceivable() {
    return this.data.R1125G4 || 0;
  }

  /**
   * Показник швидкої ліквідності
   * (Оборотні активи - Запаси) / Поточні зобов'язання
   */
  getQuickRatio() {
    const currentAssets = this.getCurrentAssets();
    const inventory = this.getInventory();
    const currentLiabilities = this.getCurrentLiabilities();
    
    if (currentLiabilities === 0) return null;
    return (currentAssets - inventory) / currentLiabilities;
  }

  /**
   * Рентабельність EBITDA, %
   * (EBITDA / Чистий дохід) * 100
   */
  getEBITDAMargin() {
    const ebitda = this.getEBITDA();
    const revenue = this.getNetRevenue();
    
    if (revenue === 0) return null;
    return (ebitda / revenue) * 100;
  }

  /**
   * Операційна рентабельність, %
   * (Операційний прибуток / Чистий дохід) * 100
   */
  getOperatingMargin() {
    const operatingProfit = this.getOperatingProfit();
    const revenue = this.getNetRevenue();
    
    if (revenue === 0) return null;
    return (operatingProfit / revenue) * 100;
  }

  /**
   * Запаси
   * Рядок 1100 форми №1
   */
  getInventory() {
    return this.data.R1100G4 || 0;
  }

  /**
   * Собівартість реалізованої продукції
   * Рядок 2050 форми №2
   */
  getCostOfGoodsSold() {
    return Math.abs(this.data.R2050G3 || 0);
  }

  /**
   * Оборотність запасів (днів)
   * (Запаси / Собівартість) * 365
   */
  getInventoryTurnoverDays() {
    const inventory = this.getInventory();
    const cogs = this.getCostOfGoodsSold();
    
    if (cogs === 0) return 0;
    return (inventory / cogs) * 365/this.multiplierYear;
  }

  /**
   * Оборотність дебіторської заборгованості (днів)
   * (Дебіторська заборгованість / Чистий дохід) * 365
   */
  getReceivablesTurnoverDays() {
    const receivables = this.getAccountsReceivable();
    const revenue = this.getNetRevenue();
    
    if (revenue === 0) return 0;
    return (receivables / revenue) * 365/this.multiplierYear;
  }

  /**
   * Кредиторська заборгованість
   * Рядок 1615 форми №1
   */
  getAccountsPayable() {
    return this.data.R1615G4 || 0;
  }

  /**
   * Поточна кредиторська заборгованість за довгостроковими зобовязаннями
   * Рядок 1610 форми №1
   */
  getAccountsPayableLongTermObligations() {
    return this.data.R1610G4 || 0;
  }

  /**
   * Оборотність кредиторської заборгованості (днів)
   * (Кредиторська заборгованість / Собівартість) * 365
   */
  getPayablesTurnoverDays() {
    const payables = this.getAccountsPayable();
    const cogs = this.getCostOfGoodsSold();
    
    if (cogs === 0) return null;
    return (payables / cogs) * 365/this.multiplierYear;
  }

  /**
   * Операційний цикл (днів)
   * Оборотність запасів + Оборотність дебіторської заборгованості
   */
  getOperatingCycle() {
    const inventoryDays = this.getInventoryTurnoverDays();
    const receivablesDays = this.getReceivablesTurnoverDays();
    
    if (inventoryDays === null || receivablesDays === null) return 0;
    return inventoryDays + receivablesDays;
  }

  /**
   * Фінансовий розрив (днів)
   * Операційний цикл - Оборотність кредиторської заборгованості
   */
  getCashConversionCycle() {
    const operatingCycle = this.getOperatingCycle();
    const payablesDays = this.getPayablesTurnoverDays();
    
    if (operatingCycle === null || payablesDays === null) return 0;
    return operatingCycle - payablesDays;
  }

  /**
   * Темп росту виручки, %
   * ((Виручка поточна - Виручка попередня) / Виручка попередня) * 100
   */
  getRevenueGrowthRate() {
    const currentRevenue = this.data.R2000G3 || 0;
    const previousRevenue = this.data.R2000G4 || 0;
    
    if (previousRevenue === 0) return null;
    return ((currentRevenue - previousRevenue) / previousRevenue) * 100;
  }

  /**
   * Темп росту дебіторської заборгованості, %
   */
  getReceivablesGrowthRate() {
    const currentReceivables = this.data.R1125G4 || 0;
    const previousReceivables = this.data.R1125G3 || 0;
    
    if (previousReceivables === 0) return null;
    return ((currentReceivables - previousReceivables) / previousReceivables) * 100;
  }

  /**
   * Темп росту кредиторської заборгованості, %
   */
  getPayablesGrowthRate() {
    const currentPayables = this.data.R1615G4 || 0;
    const previousPayables = this.data.R1615G3 || 0;
    
    if (previousPayables === 0) return null;
    return ((currentPayables - previousPayables) / previousPayables) * 100;
  }

  /**
   * Коефіцієнт фінансової незалежності, %
   * Те саме що й частка власного капіталу
   */
  getFinancialIndependenceRatio() {
    return this.getEquityRatio();
  }

  /**
   * Основні засоби
   * Рядок 1010 форми №1
   */
  getFixedAssets() {
    return this.data.R1010G4 || 0;
  }

  /**
   * Основні засоби (доля від валюти балансу), %
   */
  getFixedAssetsRatio() {
    const fixedAssets = this.getFixedAssets();
    const totalAssets = this.data.R1300G4 || 0;
    
    if (totalAssets === 0) return null;
    return (fixedAssets / totalAssets) * 100;
  }

  /**
   * Первісна вартість основних засобів
   * Рядок 1011 форми №1
   */
  getFixedAssetsOriginalCost() {
    return this.data.R1011G4 || 0;
  }

  /**
   * Знос основних засобів
   * Рядок 1012 форми №1
   */
  getFixedAssetsDepreciation() {
    return this.data.R1012G4 || 0;
  }

  /**
   * Рівень зносу основних засобів, %
   * (Знос / Первісна вартість) * 100
   */
  getFixedAssetsWearRate() {
    const depreciation = this.getFixedAssetsDepreciation();
    const originalCost = this.getFixedAssetsOriginalCost();
    
    if (originalCost === 0) return null;
    return (depreciation / originalCost) * 100;
  }

  /**
   * Орієнтоване кредитне навантаження на 1 рік
   * EBITDA приведена до року - Чистий фінансовий борг
   */
  getDebtToRevenueRatio() {
    const netDebt = this.getNetDebt();
    const ebitda = this.getEBITDA();
    const ebitdaYear = ebitda*this.multiplierYear;
    return ebitdaYear - netDebt;
  }

  /**
   * Повний розрахунок всіх показників
   */
  calculate() {
    return {
      // Базові показники
      netRevenue: this.getNetRevenue(),
      equity: this.getEquity(),
      shortTermLoans: this.getShortTermLoans(),
      longTermLoans: this.getLongTermLoans(),
      otherFinancialObligations: this.getOtherObligations(),
      equityRatio: this.getEquityRatio(),
      netProfit: this.getNetProfit(),
      assetsDynamics: this.getAssetsDynamics(),
      ebitda: this.getEBITDA(),
      operatingProfit: this.getOperatingProfit(),
      depreciation: this.getDepreciation(),
      netDebt: this.getNetDebt(),
      debtToEBITDA: this.getDebtToEBITDA(),
      ebitdaToFinancialExpenses: this.getEBITDAToFinancialExpenses(),
      
      // Показники ліквідності
      currentRatio: this.getCurrentRatio(),
      cashRatio: this.getCashRatio(),
      quickRatio: this.getQuickRatio(),
      
      // Показники рентабельності
      ebitdaMargin: this.getEBITDAMargin(),
      operatingMargin: this.getOperatingMargin(),
      
      // Показники оборотності
      inventoryTurnoverDays: this.getInventoryTurnoverDays(),
      receivablesTurnoverDays: this.getReceivablesTurnoverDays(),
      payablesTurnoverDays: this.getPayablesTurnoverDays(),
      operatingCycle: this.getOperatingCycle(),
      cashConversionCycle: this.getCashConversionCycle(),
      
      // Темпи росту
      revenueGrowthRate: this.getRevenueGrowthRate(),
      receivablesGrowthRate: this.getReceivablesGrowthRate(),
      payablesGrowthRate: this.getPayablesGrowthRate(),
      
      // Інші показники
      financialIndependenceRatio: this.getFinancialIndependenceRatio(),
      fixedAssetsRatio: this.getFixedAssetsRatio(),
      fixedAssetsWearRate: this.getFixedAssetsWearRate(),
      debtToRevenueRatio: this.getDebtToRevenueRatio(),
      
      // Метадані
      reportType: this.isFullReport ? "Повна" : "Скорочена"
    };
  }

  /**
   * Форматований вивід результатів
   */
  getFormattedResults() {
    const results = this.calculate();
    
    // const formatValue = (value, decimals = 2) => {
    //   if (value === null || value === undefined) return "-";
    //   return value.toFixed(decimals);
    // };

    const formatValue = (value, decimals = 2) => {
      if (value === null || value === undefined || value === "") return "-";
      
      const num = Number(value);
      
      // Перевірка на NaN
      if (isNaN(num)) return "-";
      
      // Форматуємо число з десятковими знаками
      const fixed = num.toFixed(decimals);
      
      // Розділяємо на цілу та дробову частини
      const [integer, decimal] = fixed.split(".");
      
      // Додаємо пробіли для тисяч
      const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
      
      // Повертаємо з дробовою частиною
      return decimal ? `${formattedInteger}.${decimal}` : `${formattedInteger}`;
    };


    
    return {
      "Тип звітності": results.reportType,
      
      // Базові показники
      "Чистий дохід від реалізації, тис. грн": formatValue(results.netRevenue),
      "Власний капітал, тис. грн": formatValue(results.equity),
      "Короткострокові кредити, тис. грн": formatValue(results.shortTermLoans),
      "Довгострокові кредити, тис. грн": formatValue(results.longTermLoans),
      "Інші фінансові зобов'язання, тис. грн": formatValue(results.otherFinancialObligations),
      "Частка власного капіталу, %": formatValue(results.equityRatio),
      "Чистий прибуток/збиток, тис. грн": formatValue(results.netProfit),
      "Динаміка активів, тис. грн": formatValue(results.assetsDynamics),
      "EBITDA, тис. грн": formatValue(results.ebitda),
      "Операційний прибуток/збиток, тис. грн": formatValue(results.operatingProfit),
      "Амортизація, тис. грн": formatValue(results.depreciation),
      "Чистий фінансовий борг, тис. грн": formatValue(results.netDebt),
      "Співвідношення чистого фінансового боргу до показника EBITDA": formatValue(results.debtToEBITDA),
      "Співвідношення показника EBITDA до фінансових витрат": formatValue(results.ebitdaToFinancialExpenses),
      
      // Показники ліквідності
      "Показник загальної ліквідності": formatValue(results.currentRatio),
      "Показник абсолютної ліквідності": formatValue(results.cashRatio),
      "Показник швидкої ліквідності": formatValue(results.quickRatio),
      
      // Показники рентабельності
      "Рентабельність EBITDA, %": formatValue(results.ebitdaMargin),
      "Операційна рентабельність, %": formatValue(results.operatingMargin),
      
      // Показники оборотності
      "Оборотність запасів, днів": formatValue(results.inventoryTurnoverDays, 0),
      "Оборотність дебіторської заборгованості, днів": formatValue(results.receivablesTurnoverDays, 0),
      "Оборотність кредиторської заборгованості, днів": formatValue(results.payablesTurnoverDays, 0),
      "Операційний цикл, днів": formatValue(results.operatingCycle, 0),
      "Фінансовий розрив, днів": formatValue(results.cashConversionCycle, 0),
      
      // Темпи росту
      "Темп росту виручки, %": formatValue(results.revenueGrowthRate),
      "Темп росту дебіторської заборгованості, %": formatValue(results.receivablesGrowthRate),
      "Темп росту кредиторської заборгованості, %": formatValue(results.payablesGrowthRate),
      
      // Інші показники
      "Коефіцієнт фінансової незалежності, %": formatValue(results.financialIndependenceRatio),
      "Основні засоби (доля від валюти балансу), %": formatValue(results.fixedAssetsRatio),
      "Рівень зносу основних засобів, %": formatValue(results.fixedAssetsWearRate),
      "Орієнтоване кредитне навантаження на 1 рік": formatValue(results.debtToRevenueRatio)
    };
  }
}


import { FIN_MICRO, FIN_MIDDLE, FIN_MIDDLE1 } from "./fin-data.js";



console.log("=== Скорочена звітність ===");
const shortCalc = new FinancialCalculator(FIN_MICRO);
console.log(JSON.stringify(shortCalc.getFormattedResults(), null, 2));

// console.log("\n=== Повна звітність ===");
// const fullCalc = new FinancialCalculator(fullReportData);
// console.log(JSON.stringify(fullCalc.getFormattedResults(), null, 2));