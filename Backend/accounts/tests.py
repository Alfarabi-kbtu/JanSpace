from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core import mail
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase


class LoginTests(APITestCase):
    # POST /api/token/ — логин по username+password (ThrottledTokenObtainPairView,
    # обычный TokenObtainPairView от simplejwt, USERNAME_FIELD у User = "username")

    def setUp(self):
        # Троттлинг считается через cache и не сбрасывается сам между тестами —
        # без очистки один тест может словить 429 из-за счётчика от предыдущего
        cache.clear()
        self.url = reverse("token_obtain_pair")
        self.password = "S0me-Str0ng-Pass!"
        self.user = User.objects.create_user(
            username="ivan", email="ivan@example.com", password=self.password
        )

    def test_login_with_valid_credentials_returns_tokens(self):
        # Arrange — юзер уже создан в setUp

        # Act
        response = self.client.post(
            self.url, {"username": "ivan", "password": self.password}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_with_wrong_password_returns_401(self):
        # Arrange
        # Act
        response = self.client.post(
            self.url, {"username": "ivan", "password": "totally-wrong-password"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_nonexistent_username_returns_401(self):
        # Arrange
        # Act
        response = self.client.post(
            self.url, {"username": "no-such-user", "password": self.password}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_inactive_user_returns_401(self):
        # Штатное поведение: ModelBackend / TokenObtainPairSerializer сами
        # проверяют is_active, отдельного кода на это в проекте нет — фиксируем тестом
        # Arrange
        self.user.is_active = False
        self.user.save()

        # Act
        response = self.client.post(
            self.url, {"username": "ivan", "password": self.password}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_missing_fields_returns_400(self):
        # Arrange
        cases = {
            "empty username": {"username": "", "password": self.password},
            "empty password": {"username": "ivan", "password": ""},
            "no fields at all": {},
        }

        for case_name, payload in cases.items():
            with self.subTest(case=case_name):
                # Act
                response = self.client.post(self.url, payload)

                # Assert
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_rate_limit_returns_429_after_too_many_attempts(self):
        # Arrange — throttle scope "login" = 5/minute (config/settings.py)
        bad_payload = {"username": "ivan", "password": "wrong-password"}

        # Act — 5 запросов укладываются в лимит
        for _ in range(5):
            response = self.client.post(self.url, bad_payload)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # 6-й запрос должен быть заблокирован троттлингом
        response = self.client.post(self.url, bad_payload)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class PasswordResetRequestTests(APITestCase):
    # POST /api/password-reset/ — запрос ссылки для сброса пароля

    def setUp(self):
        cache.clear()
        mail.outbox = []
        self.url = reverse("password_reset_request")
        self.user = User.objects.create_user(
            username="ivan", email="ivan@example.com", password="S0me-Str0ng-Pass!"
        )

    def test_password_reset_request_with_existing_email_sends_mail(self):
        # Arrange
        # Act
        response = self.client.post(self.url, {"email": "ivan@example.com"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("uid=", mail.outbox[0].body)
        self.assertIn("token=", mail.outbox[0].body)

    def test_password_reset_request_with_unknown_email_returns_200_without_sending_mail(self):
        # View намеренно отвечает 200 в обоих случаях — защита от перебора email,
        # поэтому здесь проверяем НЕ код ответа, а факт отсутствия письма
        # Arrange
        # Act
        response = self.client.post(self.url, {"email": "unknown@example.com"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_request_with_invalid_email_format_returns_400(self):
        # Arrange
        cases = ["not-an-email", "missing-at-sign.com", "", "@example.com"]

        for invalid_email in cases:
            with self.subTest(email=invalid_email):
                # Сбрасываем счётчик троттлинга перед каждым кейсом — иначе 4 запроса
                # подряд сами упрутся в лимит "password_reset" (3/minute) и тест
                # провалится не из-за валидации, а из-за 429
                cache.clear()

                # Act
                response = self.client.post(self.url, {"email": invalid_email})

                # Assert
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_rate_limit_returns_429_after_too_many_attempts(self):
        # Arrange — throttle scope "password_reset" = 3/minute
        payload = {"email": "ivan@example.com"}

        # Act
        for _ in range(3):
            response = self.client.post(self.url, payload)
            self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.post(self.url, payload)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class PasswordResetConfirmTests(APITestCase):
    # POST /api/password-reset/confirm/ — установка нового пароля по ссылке

    def setUp(self):
        cache.clear()
        self.url = reverse("password_reset_confirm")
        self.old_password = "Old-Str0ng-Pass!"
        self.user = User.objects.create_user(
            username="ivan", email="ivan@example.com", password=self.old_password
        )
        self.uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = PasswordResetTokenGenerator().make_token(self.user)

    def _payload(self, **overrides):
        payload = {
            "uidb64": self.uidb64,
            "token": self.token,
            "password": "New-Str0ng-Pass!",
            "password2": "New-Str0ng-Pass!",
        }
        payload.update(overrides)
        return payload

    def test_password_reset_confirm_with_valid_token_changes_password(self):
        # Arrange
        # Act
        response = self.client.post(self.url, self._payload())

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("New-Str0ng-Pass!"))

    def test_password_reset_confirm_old_password_no_longer_works_after_reset(self):
        # Arrange
        self.client.post(self.url, self._payload())

        # Act
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "ivan", "password": self.old_password},
        )

        # Assert
        self.assertEqual(login_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_reset_confirm_with_invalid_token_returns_400(self):
        # Arrange
        # Act
        response = self.client.post(
            self.url, self._payload(token="obviously-not-a-real-token")
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.old_password))

    def test_password_reset_confirm_with_reused_token_returns_400(self):
        # Токен построен на хэше пароля/last_login — после первой успешной смены
        # пароля повторное использование той же ссылки должно быть отклонено
        # Arrange
        self.client.post(self.url, self._payload())

        # Act
        second_response = self.client.post(
            self.url, self._payload(password="Another-Pass!1", password2="Another-Pass!1")
        )

        # Assert
        self.assertEqual(second_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_reset_confirm_with_bad_uidb64_returns_400(self):
        # Arrange
        # Act
        response = self.client.post(self.url, self._payload(uidb64="not-valid-base64"))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_reset_confirm_passwords_mismatch_returns_400(self):
        # Arrange
        # Act
        response = self.client.post(
            self.url, self._payload(password2="Different-Pass!1")
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_reset_confirm_with_weak_password_returns_400(self):
        # validate_password() встроенного Django-валидатора должен отклонить
        # слишком простой/короткий/полностью числовой пароль
        # Arrange
        weak_passwords = ["123", "password", "12345678"]

        for weak_password in weak_passwords:
            with self.subTest(password=weak_password):
                # Act
                response = self.client.post(
                    self.url,
                    self._payload(password=weak_password, password2=weak_password),
                )

                # Assert
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class RegistrationTests(APITestCase):
    # POST /api/register/ — регистрация нового юзера (RegisterSerializer + RegisterView)

    def setUp(self):
        cache.clear()
        self.url = reverse("register")

    def _payload(self, **overrides):
        payload = {
            "username": "new_user",
            "email": "new_user@example.com",
            "password": "S0me-Str0ng-Pass!",
            "password2": "S0me-Str0ng-Pass!",
        }
        payload.update(overrides)
        return payload

    def test_register_with_valid_data_creates_user_and_returns_tokens(self):
        # Arrange
        # Act
        response = self.client.post(self.url, self._payload())

        # Assert
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username="new_user").exists())
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        # пароль не должен светиться в ответе ни в каком виде
        self.assertNotIn("password", response.data["user"])

    def test_register_password_is_stored_hashed(self):
        # Arrange
        # Act
        self.client.post(self.url, self._payload())

        # Assert
        user = User.objects.get(username="new_user")
        self.assertTrue(user.check_password("S0me-Str0ng-Pass!"))
        self.assertNotEqual(user.password, "S0me-Str0ng-Pass!")

    def test_register_with_duplicate_email_returns_400(self):
        # Arrange
        User.objects.create_user(
            username="existing", email="taken@example.com", password="Existing-Pass!1"
        )

        # Act
        response = self.client.post(self.url, self._payload(email="taken@example.com"))

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_register_with_duplicate_username_returns_400(self):
        # Arrange — уникальность username обеспечивает сама модель User (unique=True),
        # DRF ModelSerializer подставляет для неё валидатор автоматически
        User.objects.create_user(
            username="new_user", email="someone@example.com", password="Existing-Pass!1"
        )

        # Act
        response = self.client.post(self.url, self._payload())

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data)

    def test_register_with_mismatched_passwords_returns_400(self):
        # Arrange
        # Act
        response = self.client.post(
            self.url, self._payload(password2="Different-Pass!1")
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username="new_user").exists())

    def test_register_with_weak_password_returns_400(self):
        # Arrange
        weak_passwords = ["123", "password", "12345678"]

        for weak_password in weak_passwords:
            with self.subTest(password=weak_password):
                # Act
                response = self.client.post(
                    self.url,
                    self._payload(password=weak_password, password2=weak_password),
                )

                # Assert
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertFalse(User.objects.filter(username="new_user").exists())

    def test_register_with_missing_or_invalid_fields_returns_400(self):
        # Arrange
        cases = {
            "empty username": self._payload(username=""),
            "empty password": self._payload(password="", password2=""),
            "invalid email format": self._payload(email="not-an-email"),
            "no fields at all": {},
        }

        for case_name, payload in cases.items():
            with self.subTest(case=case_name):
                # Act
                response = self.client.post(self.url, payload)

                # Assert
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rate_limit_returns_429_after_too_many_attempts(self):
        # Arrange — throttle scope "register" = 5/minute; берём заведомо провальный
        # payload (пароли не совпадают), чтобы не плодить лишних юзеров в базе
        bad_payload = self._payload(password2="Different-Pass!1")

        # Act
        for _ in range(5):
            response = self.client.post(self.url, bad_payload)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        response = self.client.post(self.url, bad_payload)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class ProfileTests(APITestCase):
    # GET/PUT/PATCH /api/profile/ — ProfileView всегда работает с request.user,
    # id из URL не принимается принципиально (см. get_object в views.py)

    def setUp(self):
        cache.clear()
        self.url = reverse("profile")
        self.password = "S0me-Str0ng-Pass!"
        self.user = User.objects.create_user(
            username="ivan",
            email="ivan@example.com",
            password=self.password,
            first_name="Иван",
            last_name="Иванов",
        )

    def test_get_profile_without_authentication_returns_401(self):
        # Arrange — клиент не аутентифицирован (по умолчанию в setUp)
        # Act
        response = self.client.get(self.url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_profile_returns_current_user_data(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.get(self.url)

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "ivan")
        self.assertEqual(response.data["email"], "ivan@example.com")
        self.assertEqual(response.data["first_name"], "Иван")

    def test_patch_profile_updates_first_and_last_name(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.patch(
            self.url, {"first_name": "Пётр", "last_name": "Петров"}
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Пётр")
        self.assertEqual(self.user.last_name, "Петров")

    def test_patch_profile_cannot_change_username(self):
        # username объявлен read_only в ProfileSerializer — попытка его сменить
        # должна молча игнорироваться, а не падать ошибкой
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.patch(self.url, {"username": "hacked_name"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "ivan")

    def test_patch_profile_with_invalid_email_format_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.patch(self.url, {"email": "not-an-email"})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_endpoint_never_exposes_other_users_data(self):
        # Даже если в теле запроса подсунуть чужой id — get_object() всегда
        # возвращает request.user, а не юзера по переданному id
        # Arrange
        other_user = User.objects.create_user(
            username="petr", email="petr@example.com", password="Other-Pass!1"
        )
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.get(self.url, {"id": other_user.id})

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "ivan")


class ChangePasswordTests(APITestCase):
    # POST /api/change-password/ — смена пароля залогиненным юзером

    def setUp(self):
        cache.clear()
        self.url = reverse("change_password")
        self.old_password = "Old-Str0ng-Pass!"
        self.user = User.objects.create_user(
            username="ivan", email="ivan@example.com", password=self.old_password
        )

    def _payload(self, **overrides):
        payload = {
            "old_password": self.old_password,
            "new_password": "New-Str0ng-Pass!",
            "new_password2": "New-Str0ng-Pass!",
        }
        payload.update(overrides)
        return payload

    def test_change_password_without_authentication_returns_401(self):
        # Arrange — не аутентифицированы
        # Act
        response = self.client.post(self.url, self._payload())

        # Assert
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_with_correct_old_password_succeeds(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(self.url, self._payload())

        # Assert
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("New-Str0ng-Pass!"))

    def test_change_password_old_password_no_longer_works_after_change(self):
        # Arrange
        self.client.force_authenticate(user=self.user)
        self.client.post(self.url, self._payload())

        # Act
        login_response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "ivan", "password": self.old_password},
        )

        # Assert
        self.assertEqual(login_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_change_password_with_wrong_old_password_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(
            self.url, self._payload(old_password="totally-wrong-password")
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(self.old_password))

    def test_change_password_with_mismatched_new_passwords_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.user)

        # Act
        response = self.client.post(
            self.url, self._payload(new_password2="Different-Pass!1")
        )

        # Assert
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_change_password_with_weak_new_password_returns_400(self):
        # Arrange
        self.client.force_authenticate(user=self.user)
        weak_passwords = ["123", "password", "12345678"]

        for weak_password in weak_passwords:
            with self.subTest(password=weak_password):
                # Act
                response = self.client.post(
                    self.url,
                    self._payload(
                        new_password=weak_password, new_password2=weak_password
                    ),
                )

                # Assert
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
