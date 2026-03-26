"""NIT Module-11 check digit calculation for Colombian tax identification numbers."""

WEIGHTS = (3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71)
LOOKUP = "01987654321"


def calculate_check_digit(nit: str) -> str:
    """Calculate the Module-11 check digit for a Colombian NIT.

    Args:
        nit: NIT string (digits only, dots and dashes are stripped)

    Returns:
        Single character check digit ('0'-'9')

    Raises:
        ValueError: If nit contains non-digit characters after stripping
    """
    digits = nit.strip().replace(".", "").replace("-", "")
    if not digits.isdigit():
        raise ValueError(f"NIT must contain only digits, got: {nit}")

    remainder = sum(
        w * int(d)
        for w, d in zip(WEIGHTS, reversed(digits))
    ) % 11

    return LOOKUP[remainder]


def validate_nit(nit_with_check: str) -> bool:
    """Validate a NIT with its check digit.

    Args:
        nit_with_check: NIT string in format '900123456-7' or '9001234567'

    Returns:
        True if the check digit is correct, False otherwise
    """
    clean = nit_with_check.strip().replace(".", "").replace(" ", "")
    if "-" in clean:
        base, check = clean.rsplit("-", 1)
    else:
        base, check = clean[:-1], clean[-1]
    return calculate_check_digit(base) == check
