from pathlib import Path


def test_user_status_and_delete_routes_are_registered():
    source = Path('app/api/users.py').read_text(encoding='utf-8')
    assert '@router.patch("/{user_id}/status"' in source
    assert '@router.delete("/{user_id}"' in source
