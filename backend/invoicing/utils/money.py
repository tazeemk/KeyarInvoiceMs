from decimal import Decimal


ONES = ("", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
        "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
        "Seventeen", "Eighteen", "Nineteen")
TENS = ("", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety")


def _under_thousand(number):
    words = []
    if number >= 100:
        words.extend((ONES[number // 100], "Hundred"))
        number %= 100
    if number >= 20:
        words.append(TENS[number // 10])
        number %= 10
    if number:
        words.append(ONES[number])
    return " ".join(words)


def amount_to_words(amount):
    paise = int((Decimal(amount) * 100).quantize(Decimal("1"))) % 100
    number = int(Decimal(amount))
    if number == 0:
        words = "Zero"
    else:
        chunks = (
            (10**12, "Lakh Crore"), (10**9, "Arab"), (10**7, "Crore"),
            (10**5, "Lakh"), (1000, "Thousand"), (1, ""),
        )
        parts = []
        for divisor, label in chunks:
            chunk = number // divisor
            if chunk:
                parts.append(_under_thousand(chunk) + (f" {label}" if label else ""))
                number %= divisor
        words = " ".join(parts)
    result = f"INR {words} Rupees"
    if paise:
        result += f" and {_under_thousand(paise)} Paise"
    return result + " Only"
