from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password   # встроенный валидатор паролей Django
from django.contrib.auth.tokens import PasswordResetTokenGenerator   # встроенный генератор токенов Django
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils.encoding import force_bytes, force_str
from rest_framework import serializers

class ProfileSerializer(serializers.ModelSerializer):
    # Сериализатор для просмотра/редактирования профиля текущего юзера
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]
        read_only_fields = ["id", "username"]
        # username делаем read_only специально — смена логина это отдельная
        # рискованная операция (может конфликтовать с уникальностью, ссылками и т.д.),
        # обычно её либо вообще не дают менять, либо делают отдельным сложным флоу.
        # Если хотите разрешить смену username — уберите его из read_only_fields.

class ChangePasswordSerializer(serializers.Serializer):
    # Serializer, не ModelSerializer — это разовое действие, не создание объекта
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, data):
        if data["new_password"] != data["new_password2"]:
            raise serializers.ValidationError({"new_password2": "Пароли не совпадают."})
        return data

    def validate_old_password(self, value):
        # self.context["request"] — доступ к текущему запросу (передадим его из view)
        user = self.context["request"].user
        if not user.check_password(value):
            # check_password сравнивает введённый пароль с хэшем в базе
            raise serializers.ValidationError("Неверный текущий пароль.")
        return value

class RequestPasswordResetSerializer(serializers.Serializer):
    # Serializer (не ModelSerializer!), т.к. это не создание/изменение модели,
    # а просто разовое действие с одним полем на входе
    email = serializers.EmailField()

    def validate_email(self, value):
        # Не проверяем "существует ли юзер с таким email" через ValidationError —
        # специально! Иначе злоумышленник сможет перебором узнавать,
        # какие email зарегистрированы в системе. Обработаем это молча во view.
        return value

class SetNewPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    uidb64 = serializers.CharField()   # id пользователя, закодированный в ссылке
    token = serializers.CharField()    # одноразовый токен из ссылки

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password2": "Пароли не совпадают."})

        # Декодируем uidb64 обратно в id пользователя
        try:
            uid = force_str(urlsafe_base64_decode(data["uidb64"]))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"uidb64": "Неверная ссылка."})

        # Проверяем токен — валиден ли он ещё и относится ли именно к этому юзеру
        token_generator = PasswordResetTokenGenerator()
        if not token_generator.check_token(user, data["token"]):
            raise serializers.ValidationError({"token": "Ссылка недействительна или уже использована."})

        # Сохраняем найденного юзера в validated_data, чтобы использовать его во view
        data["user"] = user
        return data

class RegisterSerializer(serializers.ModelSerializer):
    # password объявляем отдельно, чтобы:
    # 1) он не отдавался обратно в ответе (write_only=True)
    # 2) прогонялся через встроенную проверку сложности пароля Django
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password]   # проверяет: не слишком простой, не только цифры и т.д.
    )
    # password2 — подтверждение пароля (стандартная практика при регистрации)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "password2"]

    def validate_email(self, value):
        # Django по умолчанию не требует уникальности email у User — проверяем сами
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Пользователь с таким email уже зарегистрирован.")
        return value

    def validate(self, data):
        # Сверяем, что password и password2 совпадают
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password2": "Пароли не совпадают."})
        return data

    def create(self, validated_data):
        # password2 не нужен модели User — убираем перед созданием
        validated_data.pop("password2")

        # create_user() (а НЕ create()) сам хэширует пароль —
        # если использовать обычный create(), пароль сохранится открытым текстом
        user = User.objects.create_user(
            username=validated_data["username"],
            email=validated_data.get("email", ""),
            password=validated_data["password"]
        )
        return user