import { describe, it, expect } from "vitest";
import { parseWithRegex } from "../parse-natural";

describe("parseWithRegex", () => {
  describe("currency detection", () => {
    it("parses $ symbol before amount", () => {
      const result = parseWithRegex("Coffee $5.50");
      expect(result.amount).toBe(5.5);
      expect(result.currency).toBe("USD");
    });

    it("parses € symbol before amount", () => {
      const result = parseWithRegex("€15.50 lunch");
      expect(result.amount).toBe(15.5);
      expect(result.currency).toBe("EUR");
    });

    it("parses £ symbol before amount", () => {
      const result = parseWithRegex("£100 groceries");
      expect(result.amount).toBe(100);
      expect(result.currency).toBe("GBP");
    });

    it("parses currency code after amount", () => {
      const result = parseWithRegex("25 EUR coffee");
      expect(result.amount).toBe(25);
      expect(result.currency).toBe("EUR");
    });

    it("parses currency code before amount", () => {
      const result = parseWithRegex("USD 50 for groceries");
      expect(result.amount).toBe(50);
      expect(result.currency).toBe("USD");
    });

    it("defaults to USD when no currency specified", () => {
      const result = parseWithRegex("Coffee 5");
      expect(result.currency).toBe("USD");
    });

    it("handles comma as decimal separator", () => {
      const result = parseWithRegex("$5,50 coffee");
      expect(result.amount).toBe(5.5);
    });
  });

  describe("transaction type detection", () => {
    it("defaults to expense", () => {
      const result = parseWithRegex("Coffee $5");
      expect(result.type).toBe("expense");
    });

    it("detects income from 'earned'", () => {
      const result = parseWithRegex("earned $500 from freelance");
      expect(result.type).toBe("income");
    });

    it("detects income from 'salary'", () => {
      const result = parseWithRegex("salary $3000");
      expect(result.type).toBe("income");
    });

    it("detects income from 'received'", () => {
      const result = parseWithRegex("received $200 payment");
      expect(result.type).toBe("income");
    });

    it("detects transfer from 'transfer'", () => {
      const result = parseWithRegex("transfer $100 to savings");
      expect(result.type).toBe("transfer");
    });

    it("detects transfer from 'moved to'", () => {
      const result = parseWithRegex("moved to savings $500");
      expect(result.type).toBe("transfer");
    });
  });

  describe("description extraction", () => {
    it("extracts description removing amount and currency", () => {
      const result = parseWithRegex("Coffee $5.50");
      expect(result.description).toBe("Coffee");
    });

    it("removes action keywords from description", () => {
      const result = parseWithRegex("spent $25 on lunch");
      expect(result.description.trim()).toBeTruthy();
    });

    it("defaults to 'Expense' when description is empty", () => {
      const result = parseWithRegex("$25");
      expect(result.description).toBe("Expense");
    });

    it("defaults to 'Income' when income type and no description", () => {
      const result = parseWithRegex("received $500");
      expect(result.description).toBe("Income");
    });
  });

  describe("amount parsing", () => {
    it("parses integer amounts", () => {
      const result = parseWithRegex("$100 groceries");
      expect(result.amount).toBe(100);
    });

    it("parses decimal amounts", () => {
      const result = parseWithRegex("$49.99 shirt");
      expect(result.amount).toBe(49.99);
    });

    it("returns 0 when no amount found", () => {
      const result = parseWithRegex("coffee");
      expect(result.amount).toBe(0);
    });
  });

  describe("various currencies", () => {
    it("parses JPY", () => {
      const result = parseWithRegex("1500 JPY ramen");
      expect(result.currency).toBe("JPY");
      expect(result.amount).toBe(1500);
    });

    it("parses CHF", () => {
      const result = parseWithRegex("CHF 25 chocolate");
      expect(result.currency).toBe("CHF");
      expect(result.amount).toBe(25);
    });

    it("parses ¥ symbol", () => {
      const result = parseWithRegex("¥1000 sushi");
      expect(result.amount).toBe(1000);
      expect(result.currency).toBe("JPY");
    });

    it("parses ₹ symbol", () => {
      const result = parseWithRegex("₹500 dinner");
      expect(result.amount).toBe(500);
      expect(result.currency).toBe("INR");
    });
  });
});
