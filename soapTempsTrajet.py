from spyne import Application, rpc, ServiceBase, Iterable, Integer, Unicode, Decimal, Boolean
from spyne.protocol.soap import Soap11
from spyne.server.wsgi import WsgiApplication

class TempsTrajetService(ServiceBase):
    @rpc(Decimal, Decimal, Decimal, _returns=Decimal)
    def temps_trajet(ctx, distance, moyenne, points):
        """
            Calcule le temps de trajet en fonction de la distance, de la vitesse moyenne et du nombre de points de passage
            @param distance: distance du trajet
            @param moyenne: vitesse moyenne du trajet
            @param points: nombre de points de passage
            @return: temps de trajet
        """
        temps = distance / moyenne 
        return temps + (points*30)

application = Application([TempsTrajetService], 'spyne.examples.tempsTrajet.soap',
                            in_protocol=Soap11(validator='lxml'),
                            out_protocol=Soap11())
wsgi_application = WsgiApplication(application)

if __name__ == '__main__':
    from wsgiref.simple_server import make_server
    server = make_server('127.0.0.1', 8000, wsgi_application)
    server.serve_forever()
