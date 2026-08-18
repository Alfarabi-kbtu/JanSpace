from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.views import TokenObtainPairView
from .throttles import LoginRateThrottle, RegisterRateThrottle, PasswordResetRateThrottle
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import ProfileSerializer, ChangePasswordSerializer
from .serializers import RegisterSerializer, RequestPasswordResetSerializer, SetNewPasswordSerializer

class ThrottledTokenObtainPairView(TokenObtainPairView):
    throttle_classes = [LoginRateThrottle]

class ProfileView(generics.RetrieveUpdateAPIView):
    # RetrieveUpdateAPIView сразу даёт GET (посмотреть) и PUT/PATCH (обновить)
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileSerializer

    def get_object(self):
        # Всегда возвращаем именно ТЕКУЩЕГО залогиненного юзера,
        # а не какого-то по id из URL — так пользователь не может
        # случайно (или специально) посмотреть/изменить чужой профиль
        return self.request.user


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={"request": request}   # передаём request, чтобы serializer видел request.user
        )
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        return Response({"detail": "Пароль успешно изменён."}, status=status.HTTP_200_OK)

class RegisterView(generics.CreateAPIView):
    # AllowAny — регистрация должна быть доступна БЕЗ авторизации
    # (иначе получится замкнутый круг: нужен токен, чтобы получить токен)
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [RegisterRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)   # если невалидно — сразу 400 с ошибками
        user = serializer.save()   # вызывает serializer.create() выше, возвращает нового User

        # Генерируем JWT-токены сразу для нового юзера,
        # чтобы фронтенд мог залогинить его сразу после регистрации
        refresh = RefreshToken.for_user(user)

        return Response({
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email,
            },
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        }, status=201)

class RequestPasswordResetView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetRateThrottle]

    def post(self, request):
        serializer = RequestPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        user = User.objects.filter(email=email).first()

        if user:
            # Генерируем уникальный одноразовый токен для этого юзера
            token_generator = PasswordResetTokenGenerator()
            token = token_generator.make_token(user)

            # Кодируем id юзера в base64, чтобы безопасно передать в URL
            uidb64 = urlsafe_base64_encode(force_bytes(user.pk))

            # Собираем ссылку, которую отправим на почту
            reset_link = f"{settings.FRONTEND_RESET_PASSWORD_URL}?uid={uidb64}&token={token}"

            send_mail(
                subject="Восстановление пароля",
                message=f"Для сброса пароля перейдите по ссылке:\n{reset_link}\n\nЕсли это были не вы — проигнорируйте это письмо.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,   # если письмо не отправится — увидим ошибку в консоли/логах
            )

        # ВАЖНО: отвечаем ОДИНАКОВО, есть юзер с таким email или нет.
        # Это защита от "перебора почт" — злоумышленник не должен узнать,
        # зарегистрирован ли конкретный email в системе.
        return Response(
            {"detail": "Если такой email зарегистрирован, письмо со ссылкой для сброса пароля отправлено."},
            status=status.HTTP_200_OK
        )


class SetNewPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SetNewPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["password"])   # set_password хэширует пароль сам
        user.save()

        return Response({"detail": "Пароль успешно изменён."}, status=status.HTTP_200_OK)