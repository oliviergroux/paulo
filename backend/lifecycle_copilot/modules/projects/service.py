from lifecycle_copilot.modules.projects import repository


def list_projects():
    return repository.list_projects()


def get_project(project_id: int):
    return repository.require_project(project_id)


def create_project(payload: dict):
    return repository.create_project(payload)


def update_project(project_id: int, payload: dict):
    repository.require_project(project_id)
    return repository.update_project(project_id, payload)


def delete_project(project_id: int):
    repository.delete_project(project_id)
