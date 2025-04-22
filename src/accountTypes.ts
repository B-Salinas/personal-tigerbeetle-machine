export enum AccountCategory {
  CREDIT_CARD = 'CREDIT_CARD',
  LOAN = 'LOAN',
  STUDENT_LOAN = 'STUDENT_LOAN',
  IOU = 'IOU',
  CHECKING = 'CHECKING',
  DEBIT = 'DEBIT'
}

export class Account {
  constructor(
    public id: string,
    public name: string,
    public category: AccountCategory,
    public accountNumber: string,
    public totalAmount: number,
    public currentBalance: number,
    public isActive: boolean,
    public apr?: number,
    public isClosed: boolean = false
  ) {}

  get paymentPercentage(): number {
    if (this.totalAmount === 0) return 100;
    return ((this.totalAmount - this.currentBalance) / this.totalAmount) * 100;
  }
}

export const ACCOUNTS: Account[] = [
  new Account(
    '0',
    'Security First CU',
    AccountCategory.CHECKING,
    '9410',
    0,
    0,
    true
  ),
  new Account(
    '1',
    'GS 3286',
    AccountCategory.CREDIT_CARD,
    '3286',
    1500.00,
    1471.76,
    true,
    26.24
  ),
  new Account(
    '2',
    'BOFA 0273',
    AccountCategory.CREDIT_CARD,
    '0273',
    1000.00,
    994.80,
    true,
    27.24
  ),
  new Account(
    '3',
    'Upstart',
    AccountCategory.LOAN,
    '',
    1100.00,
    605.26,
    true,
    28.87
  ),
  new Account(
    '4',
    'Affirm Saint Laurent',
    AccountCategory.LOAN,
    '',
    627.85,
    523.21,
    true,
    0.00
  ),
  new Account(
    '5',
    'Meratas',
    AccountCategory.LOAN,
    '',
    16200.00,
    14117.70,
    true,
    9.90
  ),
  new Account(
    '6',
    'Nelnet',
    AccountCategory.STUDENT_LOAN,
    '',
    25560.30,
    25560.30,
    true,
    4.32
  ),
  new Account(
    '7',
    'Aaron',
    AccountCategory.IOU,
    '',
    1000.00,
    1000.00,
    true,
    0.00
  ),
  new Account(
    '8',
    'David',
    AccountCategory.IOU,
    '',
    3000.00,
    3000.00,
    true,
    0.00
  ),
  new Account(
    '9',
    'BOFA 0512',
    AccountCategory.CHECKING,
    '0512',
    4300.49,
    2587.60,
    true,
    0.00,
    true
  ),
  new Account(
    '10',
    'Coinbase 5661',
    AccountCategory.CHECKING,
    '5661',
    0.00,
    0.00,
    true
  )
]; 