"""Seed the initial admin user if no users exist."""
import asyncio

from sqlalchemy import select

from app.core.database import async_session_maker
from app.core.security import hash_password
from app.models.user import User


async def seed_admin_user(username: str = "admin", password: str = "admin") -> None:
    """Create admin user if no users exist. Called on first startup.

    WARNING: The default password is 'admin'. Change it immediately after first login.
    """
    async with async_session_maker() as session:
        result = await session.execute(select(User).limit(1))
        if result.scalar_one_or_none() is None:
            admin = User(
                username=username,
                hashed_password=hash_password(password),
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            print(f"Admin user '{username}' created with default password. CHANGE IT IMMEDIATELY.")
        else:
            print("Users already exist, skipping seed.")


if __name__ == "__main__":
    asyncio.run(seed_admin_user())
