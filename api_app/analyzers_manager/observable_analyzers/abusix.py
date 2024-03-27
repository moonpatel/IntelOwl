# This file is a part of IntelOwl https://github.com/intelowlproject/IntelOwl
# See the file 'LICENSE' for copying permission.

import logging

import querycontacts

from api_app.analyzers_manager import classes

logger = logging.getLogger(__name__)


class Abusix(classes.ObservableAnalyzer):
    def run(self):
        result = {}
        try:
            ip_addr = self.observable_name
            cf = querycontacts.ContactFinder()
            abuse_contacts = cf.find(ip_addr)
            if not abuse_contacts:
                abuse_contacts = []
            result["abuse_contacts"] = abuse_contacts
        except Exception as e:
            logger.error(e)
            result["error"] = e
        return result

    @classmethod
    def _monkeypatch(cls):
        patches = []
        return super()._monkeypatch(patches=patches)
