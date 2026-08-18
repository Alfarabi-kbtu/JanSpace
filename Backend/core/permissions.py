# core/permissions.py

from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Разрешает ЧТЕНИЕ (GET, HEAD, OPTIONS) всем — даже неавторизованным.
    Разрешает ИЗМЕНЕНИЕ (POST, PUT, PATCH, DELETE) только пользователям с is_staff=True.
    """

    def has_permission(self, request, view):
        # SAFE_METHODS — это встроенный список DRF: ('GET', 'HEAD', 'OPTIONS')
        if request.method in permissions.SAFE_METHODS:
            return True

        # Для остальных методов (изменяющих данные) — пользователь должен быть
        # авторизован И быть staff/админом
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)