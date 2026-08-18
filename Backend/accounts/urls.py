from django.urls import path
from .views import RegisterView, RequestPasswordResetView, SetNewPasswordView
from .views import (
    RegisterView,
    RequestPasswordResetView,
    SetNewPasswordView,
    ProfileView,          # ⬅ новое
    ChangePasswordView,   # ⬅ новое
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("password-reset/", RequestPasswordResetView.as_view(), name="password_reset_request"),
    path("password-reset/confirm/", SetNewPasswordView.as_view(), name="password_reset_confirm"),

    path("profile/", ProfileView.as_view(), name="profile"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
]