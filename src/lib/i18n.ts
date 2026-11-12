import { Currency, ExpenseCategory, FundingSource, IncomeCategory, Language } from '@/types/finance';

export interface Translations {
  appTitle: string;
  appSubtitle: string;
  nav: {
    record: string;
    daily: string;
    monthly: string;
    yearly: string;
    investments: string;
    savings: string;
  };
  actions: {
    save: string;
    confirm: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    clear: string;
    export: string;
    import: string;
    dailyReminder: string;
    reminderDesc: string;
    reminderTime: string;
    reminderScheduled: string;
    reminderDisabled: string;
    permissionDenied: string;
    reset: string;
    confirmPay: string;
    paidThisMonth: string;
  };
  record: {
    title: string;
    smartEntryTitle: string;
    pressEnterToSave: string;
    recordButton: string;
    amountLabel: string;
    amountPlaceholder: string;
    quickPresets: string;
    typeExpense: string;
    typeIncome: string;
    typeSavings: string;
    fundingSource: string;
    selectCategory: string;
    date: string;
    note: string;
    notePlaceholder: string;
    smartTextPlaceholder: string;
    smartTextHint: string;
    recentTransactions: string;
    items: string;
    noTransactions: string;
    recurringBillsTitle: string;
    recurringBillsDesc: string;
    today: string;
    manageCategories: string;
    categoriesSettingsTitle: string;
    categoriesSettingsDesc: string;
    hiddenCategoriesNotice: string;
    visible: string;
    hidden: string;
    showCategory: string;
    hideCategory: string;
    addBill: string;
    editBill: string;
    editTransaction: string;
    addTransaction: string;
    recordTodayExpense: string;
    billName: string;
    billNamePlaceholder: string;
    billAmount: string;
    billCategory: string;
    billSource: string;
    dayOfMonth: string;
    noRecurringBills: string;
    searchPlaceholder: string;
    allTypes: string;
    allSources: string;
    filterResults: string;
    noMatchingTransactions: string;
    resetFilters: string;
    sortBy: string;
    sortNewestDate: string;
    sortOldestDate: string;
    sortRecentAdded: string;
    sortHighestAmount: string;
    sortLowestAmount: string;
    page: string;
    of: string;
    prev: string;
    next: string;
  };
  sources: Record<FundingSource, string>;
  expenseCategories: Record<ExpenseCategory, string>;
  incomeCategories: Record<IncomeCategory, string>;
  investmentCategories: {
    stock: string;
    crypto: string;
    mutual_fund: string;
    gold: string;
    deposit: string;
  };
  summary: {
    monthlyTitle: string;
    yearlyTitle: string;
    totalIncome: string;
    totalExpense: string;
    netSavings: string;
    netCashFlow: string;
    savingsRate: string;
    dailyAverage: string;
    categoryBreakdown: string;
    topCategoriesComparison: string;
    rankedByTotal: string;
    ofIncome: string;
    perDay: string;
    comparisonVsLastMonth: string;
    higherThanLastMonth: string;
    lowerThanLastMonth: string;
    monthlyTrend: string;
    thisYear: string;
    fullYear: string;
    annualIncome: string;
    annualExpenses: string;
    annualSavings: string;
    annualNetCashflow: string;
    annualTotal: string;
    topExpenses: string;
    ofTotalExpenses: string;
    savingGoal: string;
    currentMonth: string;
    allMonths: string;
    monthlyBudgetPlan: string;
    monthlyBudgetPlanDesc: string;
    setBudgetPlan: string;
    editBudgetPlan: string;
    totalMonthlyBudget: string;
    plannedBudget: string;
    budgetRemaining: string;
    budgetOver: string;
    categoryBudgets: string;
    noBudgetPlanSet: string;
    totalAllocated: string;
    selectMonth: string;
    quickJump: string;
    withinBudget: string;
    overBudget: string;
    targetVsActual: string;
  };
  investments: {
    title: string;
    netWorthTitle: string;
    combinedSubtitle: string;
    totalCostBasis: string;
    totalCurrentValue: string;
    unrealizedGainLoss: string;
    portfolioAllocation: string;
    assetName: string;
    assetCategory: string;
    costBasis: string;
    currentValue: string;
    addAsset: string;
    editAsset: string;
    noAssets: string;
    liquidCash: string;
    totalInvested: string;
    investmentsShort: string;
    totalCapitalInvested: string;
    currentMarketAppraisal: string;
    floatingReturn: string;
    holdingsBreakdown: string;
    valuationMonitor: string;
    returnLabel: string;
    amountInvested: string;
    customValuationToggle: string;
    customValuationHint: string;
    searchPlaceholder: string;
    allCategories: string;
    noMatchingAssets: string;
    sortHighestValue: string;
    sortLowestValue: string;
    sortHighestReturn: string;
    sortLowestReturn: string;
    sortNameAZ: string;
    sortRecentAdded: string;
  };
  savings: {
    title: string;
    monthlyTarget: string;
    monthlyActual: string;
    accumulatedReserves: string;
    targetProgress: string;
    addSavingsRecord: string;
    emergencyFundHint: string;
    quickTransferTitle: string;
    activityFeed: string;
    adjustTarget: string;
    updateTarget: string;
  };
  dailySpend: {
    title: string;
    subtitle: string;
    todayTarget: string;
    todaySpent: string;
    todayRemaining: string;
    adjustDailyTarget: string;
    updateDailyTarget: string;
    safeStatus: string;
    overBudgetStatus: string;
    targetProgress: string;
    dailyHistoryTitle: string;
    dailyTrendTitle: string;
    noExpenses: string;
    averageDaily: string;
    daysTracked: string;
    dayExpenses: string;
    filterAll: string;
    filterThisMonth: string;
    filterThisWeek: string;
    filterCustom: string;
    from: string;
    to: string;
    targetAdherence: string;
    monthToDateSpend: string;
    addSpend: string;
    setTarget: string;
    safeDays: string;
    overDays: string;
    withinTargetLegend: string;
    exceededLegend: string;
  };
}

export const translations: Record<Language, Translations> = {
  en: {
    appTitle: 'Dailyba',
    appSubtitle: 'Daily Balance & Wealth Tracker',
    nav: {
      record: 'Transactions',
      daily: 'Daily Spend',
      monthly: 'Monthly',
      yearly: 'Yearly',
      investments: 'Investments',
      savings: 'Savings',
    },
    actions: {
      save: 'Save Transaction',
      confirm: 'Confirm',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      add: 'Add New',
      clear: 'Clear',
      export: 'Settings & Data Backup',
      import: 'Import Data',
      dailyReminder: 'Daily Log Reminder',
      reminderDesc: 'Receive a gentle local reminder each evening to record your daily spending.',
      reminderTime: 'Reminder Time',
      reminderScheduled: 'Daily reminder scheduled successfully.',
      reminderDisabled: 'Daily reminder turned off.',
      permissionDenied: 'Notification permission was denied. Please allow notifications in device settings.',
      reset: 'Load Sample Data',
      confirmPay: 'Mark as Paid',
      paidThisMonth: 'Paid for this month',
    },
    record: {
      title: 'Daily Quick Record',
      smartEntryTitle: 'Smart Quick Entry',
      pressEnterToSave: 'Press Enter to save',
      recordButton: 'Record',
      amountLabel: 'Amount',
      amountPlaceholder: '0',
      quickPresets: 'Quick Amounts',
      typeExpense: 'Expense',
      typeIncome: 'Income',
      typeSavings: 'Save to Reserves',
      fundingSource: 'Funding Source',
      selectCategory: 'Category',
      date: 'Date',
      note: 'Note',
      notePlaceholder: 'Brief description...',
      smartTextPlaceholder: 'e.g. "train 2500 bank" or "lunch 35k"...',
      smartTextHint: 'Auto-parses category, amount & source (e.g. "lunch 35k ewallet")',
      recentTransactions: 'Recent Transactions',
      items: 'items',
      noTransactions: 'No transactions recorded yet.',
      recurringBillsTitle: 'Monthly Recurring Bills',
      recurringBillsDesc: 'Fixed monthly obligations (mark when paid)',
      today: 'Today',
      manageCategories: 'Manage Categories',
      categoriesSettingsTitle: 'Category Visibility',
      categoriesSettingsDesc: 'Choose which categories to display or hide across the entire app.',
      hiddenCategoriesNotice: 'Hidden categories are completely omitted from quick forms, monthly breakdowns, and annual charts.',
      visible: 'Visible',
      hidden: 'Hidden',
      showCategory: 'Show',
      hideCategory: 'Hide',
      addBill: 'Add Recurring Bill',
      editBill: 'Edit Recurring Bill',
      editTransaction: 'Edit Transaction',
      addTransaction: 'Add Transaction',
      recordTodayExpense: "Record Today's Spend",
      billName: 'Bill Name / Label',
      billNamePlaceholder: 'e.g. Rent, Netflix, Internet Plan',
      billAmount: 'Monthly Amount',
      billCategory: 'Expense Category',
      billSource: 'Funding Source',
      dayOfMonth: 'Due Day of Month (Optional)',
      noRecurringBills: 'No recurring bills configured. Tap "Add Bill" to create one.',
      searchPlaceholder: 'Search note, category, amount...',
      allTypes: 'All Types',
      allSources: 'All Sources',
      filterResults: 'matching',
      noMatchingTransactions: 'No transactions match your filter.',
      resetFilters: 'Reset Filters',
      sortBy: 'Sort by',
      sortNewestDate: 'Newest Date',
      sortOldestDate: 'Oldest Date',
      sortRecentAdded: 'Recently Added',
      sortHighestAmount: 'Highest Amount',
      sortLowestAmount: 'Lowest Amount',
      page: 'Page',
      of: 'of',
      prev: 'Prev',
      next: 'Next',
    },
    sources: {
      cash: 'Cash',
      bank: 'Bank',
      ewallet: 'E-Wallet',
      credit_card: 'Credit Card',
    },
    expenseCategories: {
      food_drinks: 'Food & Drinks',
      shopping: 'Shopping',
      train: 'Train',
      ride: 'Ride-hail',
      laundry: 'Laundry',
      rent: 'Rent',
      family: 'Family Support',
      gifts: 'Gifts & Social',
      vps: 'VPS & Server',
      mobile: 'Mobile Data',
      others: 'Others',
    },
    incomeCategories: {
      salary: 'Salary',
      freelance: 'Freelance',
      bonus: 'Bonus',
      dividend: 'Dividends',
      carryover: 'Carryover',
      others: 'Other Income',
    },
    investmentCategories: {
      stock: 'Stocks & Equities',
      crypto: 'Crypto & Digital Assets',
      mutual_fund: 'Mutual Funds / ETF',
      gold: 'Gold & Commodities (Physical / Digital)',
      deposit: 'Fixed Term Deposit',
    },
    summary: {
      monthlyTitle: 'Monthly Overview',
      yearlyTitle: 'Annual Performance',
      totalIncome: 'Total Income',
      totalExpense: 'Total Expenses',
      netSavings: 'Allocated to Savings',
      netCashFlow: 'Net Cash Flow',
      savingsRate: 'Savings Rate',
      dailyAverage: 'Daily Burn Rate',
      categoryBreakdown: 'Expense Breakdown by Category',
      topCategoriesComparison: 'Top Categories Comparison',
      rankedByTotal: 'Ranked by total',
      ofIncome: 'of income',
      perDay: '/ day',
      comparisonVsLastMonth: 'vs Previous Month',
      higherThanLastMonth: 'higher than last month',
      lowerThanLastMonth: 'lower than last month',
      monthlyTrend: '12-Month Inflow vs Outflow',
      thisYear: 'This Year',
      fullYear: 'Full Year',
      annualIncome: 'Annual Income',
      annualExpenses: 'Annual Expenses',
      annualSavings: 'Annual Savings',
      annualNetCashflow: 'Annual Net Cashflow',
      annualTotal: 'Year-to-Date Accumulated Outflow',
      topExpenses: 'Top Expense Categories This Year',
      ofTotalExpenses: 'of total expenses',
      savingGoal: 'Monthly Savings Target',
      currentMonth: 'Current Month',
      allMonths: 'All Months',
      monthlyBudgetPlan: 'Monthly Budget & Spending Plan',
      monthlyBudgetPlanDesc: 'Target your monthly spending limit and track category allocations.',
      setBudgetPlan: 'Set Budget Plan',
      editBudgetPlan: 'Edit Plan',
      totalMonthlyBudget: 'Total Monthly Budget',
      plannedBudget: 'Budget Limit',
      budgetRemaining: 'Remaining',
      budgetOver: 'Over Limit',
      categoryBudgets: 'Category Allocations',
      noBudgetPlanSet: 'No budget plan set for this month yet. Tap "Set Budget Plan" to plan your spending.',
      totalAllocated: 'Allocated',
      selectMonth: 'Select Month',
      quickJump: 'Quick Jump',
      withinBudget: 'Within Budget',
      overBudget: 'Over Budget',
      targetVsActual: 'Planned vs Actual Spent',
    },
    investments: {
      title: 'Investment Portfolio',
      netWorthTitle: 'Total Net Worth',
      combinedSubtitle: 'Combined Liquid Reserves + Live Portfolio Valuation',
      totalCostBasis: 'Total Capital (Cost Basis)',
      totalCurrentValue: 'Market Value (Appraisal)',
      unrealizedGainLoss: 'Unrealized Gain / Loss',
      portfolioAllocation: 'Asset Allocation Breakdown',
      assetName: 'Asset Name',
      assetCategory: 'Category',
      costBasis: 'Purchase Cost (Capital)',
      currentValue: 'Current Market Valuation',
      addAsset: 'Add Asset',
      editAsset: 'Update Valuation',
      noAssets: 'No investment assets added yet.',
      liquidCash: 'Liquid Cash Reserves',
      totalInvested: 'Invested Capital',
      investmentsShort: 'Investments',
      totalCapitalInvested: 'Total Capital Invested',
      currentMarketAppraisal: 'Current Appraisal',
      floatingReturn: 'Floating Return',
      holdingsBreakdown: 'Holdings Breakdown',
      valuationMonitor: 'Valuation Monitor',
      returnLabel: 'Return',
      amountInvested: 'Amount Saved / Invested',
      customValuationToggle: 'Customize Market Valuation (Optional)',
      customValuationHint: 'Leave disabled if you just invested or market value equals your capital.',
      searchPlaceholder: 'Search asset or ticker...',
      allCategories: 'All Asset Classes',
      noMatchingAssets: 'No assets match your search or filter.',
      sortHighestValue: 'Highest Value',
      sortLowestValue: 'Lowest Value',
      sortHighestReturn: 'Highest Return (%)',
      sortLowestReturn: 'Lowest Return (%)',
      sortNameAZ: 'Name (A–Z)',
      sortRecentAdded: 'Recently Added',
    },
    savings: {
      title: 'Savings & Reserve Vault',
      monthlyTarget: 'Monthly Savings Target',
      monthlyActual: 'Actual Saved This Month',
      accumulatedReserves: 'Total Accumulated Vault',
      targetProgress: 'Target Progress',
      addSavingsRecord: 'Transfer to Vault',
      emergencyFundHint: 'Liquid emergency reserves are safely kept in cash and bank savings.',
      quickTransferTitle: 'Quick Vault Deposit',
      activityFeed: 'Reserve Transfer History',
      adjustTarget: 'Set Goal',
      updateTarget: 'Update Monthly Target',
    },
    dailySpend: {
      title: 'Daily Spending & Budget Limit',
      subtitle: 'Monitor everyday spending against your daily target to maintain financial awareness.',
      todayTarget: 'Daily Target',
      todaySpent: 'Spent Today',
      todayRemaining: 'Remaining Today',
      adjustDailyTarget: 'Adjust Daily Target',
      updateDailyTarget: 'Update Daily Target',
      safeStatus: 'Within Target',
      overBudgetStatus: 'Target Exceeded',
      targetProgress: 'Daily Budget Usage',
      dailyHistoryTitle: 'Daily Spending Breakdown',
      dailyTrendTitle: 'Daily Spending Trend (Current Month)',
      noExpenses: 'No expenses recorded for this day.',
      averageDaily: 'Average Daily Spend',
      daysTracked: 'Days Tracked',
      dayExpenses: 'Transactions on this day',
      filterAll: 'All Days',
      filterThisMonth: 'This Month',
      filterThisWeek: 'This Week',
      filterCustom: 'Custom Range',
      from: 'From',
      to: 'To',
      targetAdherence: 'Target Adherence',
      monthToDateSpend: 'Month-to-Date Spend',
      addSpend: 'Add Spend',
      setTarget: 'Set Target',
      safeDays: 'Safe',
      overDays: 'Over',
      withinTargetLegend: 'Within Target',
      exceededLegend: 'Exceeded',
    },
  },
  ja: {
    appTitle: 'Dailyba',
    appSubtitle: '日々の収支バランス・資産トラッカー',
    nav: {
      record: '取引・記帳',
      daily: '日次支出',
      monthly: '月次サマリー',
      yearly: '年次推移',
      investments: '投資・純資産',
      savings: '貯金管理',
    },
    actions: {
      save: '記録を保存',
      confirm: '確定',
      cancel: 'キャンセル',
      delete: '削除',
      edit: '編集',
      add: '新規追加',
      clear: 'クリア',
      export: '設定 & バックアップ',
      import: 'データ復元',
      dailyReminder: '日次記録リマインダー',
      reminderDesc: '毎晩、今日の支出の記録忘れを防ぐための通知を受け取ります。',
      reminderTime: '通知時刻',
      reminderScheduled: 'リマインダーを設定しました。',
      reminderDisabled: 'リマインダーをオフにしました。',
      permissionDenied: '通知の許可が得られませんでした。端末の設定で通知を許可してください。',
      reset: 'サンプルデータを読込',
      confirmPay: '支払済みにする',
      paidThisMonth: '今月分支払い済み',
    },
    record: {
      title: 'クイック支出・収入記録',
      smartEntryTitle: 'スマート即時入力',
      pressEnterToSave: '決定キーで保存',
      recordButton: '記録する',
      amountLabel: '金額',
      amountPlaceholder: '0',
      quickPresets: 'クイック入力',
      typeExpense: '支出',
      typeIncome: '収入',
      typeSavings: '貯金振替',
      fundingSource: '支出元口座',
      selectCategory: 'カテゴリー選択',
      date: '日付',
      note: 'メモ',
      notePlaceholder: 'メモを入力 (任意)...',
      smartTextPlaceholder: '例: "電車 220 口座" や "ランチ 1200"...',
      smartTextHint: 'カテゴリ・金額・支払元を自動判別（例: "ランチ 1200 口座"）',
      recentTransactions: '最近の取引履歴',
      items: '件',
      noTransactions: '取引データがありません。',
      recurringBillsTitle: '毎月の固定費 (ワンタップ確定)',
      recurringBillsDesc: '家賃やサブスク等、毎月の定額支払いを1タップで記帳',
      today: '今日',
      manageCategories: 'カテゴリ管理',
      categoriesSettingsTitle: 'カテゴリ表示設定',
      categoriesSettingsDesc: 'アプリ全体で表示または非表示にするカテゴリを選択します。',
      hiddenCategoriesNotice: '非表示のカテゴリは入力フォーム、月次サマリー、年次推移グラフ等から完全に除外されます。',
      visible: '表示中',
      hidden: '非表示',
      showCategory: '表示する',
      hideCategory: '非表示にする',
      addBill: '固定費を追加',
      editBill: '固定費を編集',
      editTransaction: '取引を編集',
      addTransaction: '取引を記録',
      recordTodayExpense: '今日の支出を記録',
      billName: '固定費の名称',
      billNamePlaceholder: '例: 家賃、サブスク、光熱費',
      billAmount: '月額',
      billCategory: 'カテゴリ',
      billSource: '支払元',
      dayOfMonth: '支払日 (任意)',
      noRecurringBills: '登録されている固定費はありません。「固定費を追加」から登録できます。',
      searchPlaceholder: 'メモ、カテゴリ、金額で検索...',
      allTypes: 'すべての種別',
      allSources: 'すべての口座',
      filterResults: '件一致',
      noMatchingTransactions: '条件に一致する取引履歴がありません。',
      resetFilters: 'フィルターを解除',
      sortBy: '並び替え',
      sortNewestDate: '日付が新しい順',
      sortOldestDate: '日付が古い順',
      sortRecentAdded: '最近追加順',
      sortHighestAmount: '金額が高い順',
      sortLowestAmount: '金額が低い順',
      page: 'ページ',
      of: '/',
      prev: '前へ',
      next: '次へ',
    },
    sources: {
      cash: '現金',
      bank: '銀行',
      ewallet: '電子マネー',
      credit_card: 'クレジットカード',
    },
    expenseCategories: {
      food_drinks: '食費',
      shopping: '買い物',
      train: '交通費',
      ride: '配車',
      laundry: '洗濯代',
      rent: '寮費',
      family: '仕送り',
      gifts: '交際費',
      vps: 'サーバー代',
      mobile: '通信費',
      others: 'その他',
    },
    incomeCategories: {
      salary: '給与',
      freelance: '副業',
      bonus: '賞与',
      dividend: '配当・利息',
      carryover: '繰越金',
      others: 'その他収入',
    },
    investmentCategories: {
      stock: '個別株式',
      crypto: '暗号資産 (BTC等)',
      mutual_fund: '投資信託 / ETF',
      gold: '金・貴金属 (現物 / デジタル積立)',
      deposit: '定期預金',
    },
    summary: {
      monthlyTitle: '月次サマリー',
      yearlyTitle: '年間パフォーマンス',
      totalIncome: '総収入',
      totalExpense: '総支出',
      netSavings: '貯金振替額',
      netCashFlow: '純キャッシュフロー',
      savingsRate: '貯蓄率',
      dailyAverage: '1日平均消費',
      categoryBreakdown: 'カテゴリ別支出内訳',
      topCategoriesComparison: '主要カテゴリ比較',
      rankedByTotal: '支出金額順',
      ofIncome: '収入比',
      perDay: '/日',
      comparisonVsLastMonth: '前月比',
      higherThanLastMonth: '前月より増加',
      lowerThanLastMonth: '前月より減少',
      monthlyTrend: '12ヶ月の収支推移',
      thisYear: '今年',
      fullYear: '年間',
      annualIncome: '年間総収入',
      annualExpenses: '年間総支出',
      annualSavings: '年間総貯金額',
      annualNetCashflow: '年間純キャッシュフロー',
      annualTotal: '年間累計支出',
      topExpenses: '今年の支出上位カテゴリー',
      ofTotalExpenses: '総支出比',
      savingGoal: '今月の貯金目標',
      currentMonth: '当月',
      allMonths: '全期間',
      monthlyBudgetPlan: '月間予算・支出計画',
      monthlyBudgetPlanDesc: '今月の支出目標を設定し、カテゴリー別の使用状況を把握',
      setBudgetPlan: '予算計画を設定',
      editBudgetPlan: '計画を編集',
      totalMonthlyBudget: '今月の予算総額',
      plannedBudget: '予算上限',
      budgetRemaining: '予算残額',
      budgetOver: '予算超過',
      categoryBudgets: 'カテゴリー別予算配分',
      noBudgetPlanSet: 'この月の予算計画はまだ設定されていません。「予算計画を設定」から登録できます。',
      totalAllocated: '配分合計',
      selectMonth: '年月を選択',
      quickJump: '月を選択',
      withinBudget: '予算内',
      overBudget: '予算超過',
      targetVsActual: '計画予算と実支出',
    },
    investments: {
      title: '資産運用ポートフォリオ',
      netWorthTitle: '純資産総額',
      combinedSubtitle: '現金預金 + 保有投資資産の時価総額',
      totalCostBasis: '投資元本合計',
      totalCurrentValue: '評価額合計',
      unrealizedGainLoss: '含み損益',
      portfolioAllocation: '資産クラス別ポートフォリオ配分',
      assetName: '資産・銘柄名',
      assetCategory: '資産クラス',
      costBasis: '購入元本',
      currentValue: '現在評価額',
      addAsset: '投資資産を追加',
      editAsset: '評価額を更新',
      noAssets: '登録されている投資資産はありません。',
      liquidCash: '現金・預金準備金',
      totalInvested: '投資元本',
      investmentsShort: '投資資産',
      totalCapitalInvested: '元本総額',
      currentMarketAppraisal: '時価評価額',
      floatingReturn: 'トータルリターン',
      holdingsBreakdown: '保有内訳',
      valuationMonitor: '時価モニター',
      returnLabel: '利回り',
      amountInvested: '投資・積立元本金額',
      customValuationToggle: '時価評価額を個別調整（任意）',
      customValuationHint: '新規積立時や時価が元本と同額の場合はチェック不要です。',
      searchPlaceholder: '資産・銘柄名を検索...',
      allCategories: '全資産クラス',
      noMatchingAssets: '条件に一致する投資資産がありません。',
      sortHighestValue: '評価額が高い順',
      sortLowestValue: '評価額が低い順',
      sortHighestReturn: 'リターンが高い順',
      sortLowestReturn: 'リターンが低い順',
      sortNameAZ: '名称順 (A-Z)',
      sortRecentAdded: '最近追加順',
    },
    savings: {
      title: '貯蓄・準備資金管理',
      monthlyTarget: '今月の貯金目標',
      monthlyActual: '今月の貯金実績',
      accumulatedReserves: '累計貯蓄・準備金',
      targetProgress: '目標達成率',
      addSavingsRecord: '貯金へ振替',
      emergencyFundHint: 'いざという時のための生活防衛資金は現金・普通預金で手元に確保します。',
      quickTransferTitle: 'クイック貯金振替',
      activityFeed: '貯金振替履歴',
      adjustTarget: '目標設定',
      updateTarget: '目標金額を更新',
    },
    dailySpend: {
      title: '日次支出・1日予算管理',
      subtitle: '毎日の支出を日次目標と比較し、使いすぎを未然に防止します。',
      todayTarget: '1日の支出目標',
      todaySpent: '本日の支出合計',
      todayRemaining: '本日使える残額',
      adjustDailyTarget: '日次目標を変更',
      updateDailyTarget: '目標を更新',
      safeStatus: '目標内',
      overBudgetStatus: '目標超過',
      targetProgress: '本日の消化率',
      dailyHistoryTitle: '日別支出履歴',
      dailyTrendTitle: '今月の日次支出推移',
      noExpenses: 'この日の支出はありません。',
      averageDaily: '1日平均支出',
      daysTracked: '記録日数',
      dayExpenses: 'この日の支出明細',
      filterAll: '全期間',
      filterThisMonth: '今月',
      filterThisWeek: '今週',
      filterCustom: '期間指定',
      from: '開始日',
      to: '終了日',
      targetAdherence: '目標遵守状況',
      monthToDateSpend: '今月の累計支出',
      addSpend: '支出を記録',
      setTarget: '目標を設定',
      safeDays: '目標内',
      overDays: '超過',
      withinTargetLegend: '目標内',
      exceededLegend: '目標超過',
    },
  },
};

export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === 'JPY') {
    return `¥${Math.round(amount).toLocaleString('ja-JP')}`;
  }
  if (currency === 'IDR') {
    return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
  }
  if (currency === 'MMK') {
    return `K ${Math.round(amount).toLocaleString()}`;
  }
  return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
