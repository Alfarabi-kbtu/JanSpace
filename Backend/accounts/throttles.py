from rest_framework.throttling import AnonRateThrottle


class LoginRateThrottle(AnonRateThrottle):
    # Свой "scope" — отдельный счётчик, не пересекается с общим "anon"
    scope = "login"


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = "password_reset"


class RegisterRateThrottle(AnonRateThrottle):
    scope = "register"