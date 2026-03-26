from app.services.nit import calculate_check_digit, validate_nit
import pytest


def test_check_digit_900123456():
    assert calculate_check_digit("900123456") == "7"


def test_check_digit_860069804():
    assert calculate_check_digit("860069804") == "2"


def test_validate_nit_valid():
    assert validate_nit("900123456-7") is True


def test_validate_nit_invalid():
    assert validate_nit("900123456-0") is False


def test_check_digit_non_digit_raises():
    with pytest.raises(ValueError):
        calculate_check_digit("ABC123")
