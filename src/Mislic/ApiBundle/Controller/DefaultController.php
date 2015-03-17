<?php

namespace Mislic\ApiBundle\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\Controller;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\JsonResponse;

use Sensio\Bundle\FrameworkExtraBundle\Configuration\Route;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Method;
use Sensio\Bundle\FrameworkExtraBundle\Configuration\Template;

use Mislic\SiteBundle\Entity\Site;

class DefaultController extends Controller
{
	/**
	 * @Route("/api/site/list")
	 * @Method("GET")
	 */
	public function siteListAction()
	{
		$em = $this->get('doctrine')->getManager();
		$sites = $em->getRepository('MislicSiteBundle:Site')->findBy(array(), array('slug' => 'asc'));
		$list = array_map(function($site){
			return array('id' => $site->getId(), 'slug' => $site->getSlug(), 'domain' => $site->getSlug().'.dev');
		}, $sites);
		return new JsonResponse(array('list' => $list));
	}

	protected function maybeDirAndSlugError($path, $slug, $nameForErrors = '')
	{
		if ($nameForErrors) {
			$nameForErrors = '"'.$nameForErrors.'" ';
		}
		if (!@is_dir($path)) {
			return $nameForErrors.'directory missing';
		}
		if (!@is_writable($path)) {
			return $nameForErrors.'directory not writable';
		}
		if (@file_exists($path.'/'.$slug)) {
			return $nameForErrors.'directory already has child named "'.$slug.'"';
		}
		return null;
	}

	/**
	 * @Route("/api/site/add")
	 * @Method("POST")
	 */
	public function siteAddAction(Request $req)
	{
		// slug validation
		$slug = strtolower(trim($req->getContent()));
		if (preg_match('@[^0-9a-z\-_]@uis', $slug)) {
			return new JsonResponse(array('error' => 'slug should only contain latin lettrs, numbers, underscore and hyphen'));
		}
		if (strlen($slug) < 3) {
			return new JsonResponse(array('error' => 'slug should be 3 symbols long or longer'));
		}
		if (strlen($slug) > 100) {
			return new JsonResponse(array('error' => 'slug should be 100 symbols long or shorter'));
		}
		if (!preg_match('@^[a-z][0-9a-z\-_]+[0-9a-z]$@uis', $slug)) {
			return new JsonResponse(array('error' => 'bro, take it easy with slug format, mmkay?!'));
		}

		// check DB for slug uniqueness
		$em = $this->get('doctrine')->getManager();
		$chk = $em->getRepository('MislicSiteBundle:Site')->findOneBySlug($slug);
		if ($chk) {
			return new JsonResponse(array('error' => 'site with this slug already exists'));
		}

		@clearstatcache();

		// check various directories
		$sitesRoot = $this->container->getParameter('sites_root_path');
		$nginxSitesAvailable = $this->container->getParameter('nginx_sites_available_path');
		$nginxSitesEnabled = $this->container->getParameter('nginx_sites_enabled_path');
		foreach (array(
			'sites root' => $sitesRoot,
			'nginx sites available' => $nginxSitesAvailable,
			'nginx sites enabled' => $nginxSitesEnabled
		) as $name => $path) {
			if ($err = $this->maybeDirAndSlugError($path, $slug, $name)) {
				return new JsonResponse(array('error' => 'internal error: '.$err));
			}
		}

		// create site in DB
		$site = new Site();
		$site->setSlug($slug);
		$em->persist($site);
		$em->flush();

		// create site root and web root, put default index.html
		if (!@mkdir($sitesRoot.'/'.$slug)) {
			return new JsonResponse(array('error' => 'internal error: failed to create site root'));
		}
		if (!@mkdir($sitesRoot.'/'.$slug.'/web')) {
			return new JsonResponse(array('error' => 'internal error: failed to create site web root'));
		}
		$cont = $this->get('templating')->render('MislicApiBundle:Default:default.html.twig', array('slug' => $slug));
		if (!@file_put_contents($sitesRoot.'/'.$slug.'/web/index.html', $cont, LOCK_EX)) {
			return new JsonResponse(array('error' => 'internal error: failed to create site default index.html'));
		}
		@chmod($sitesRoot.'/'.$slug.'/web/index.html', 0777);

		// create nginx default vhost for the new site
		$cfg = $this->get('templating')->render('MislicApiBundle:Default:default.nginx.twig', array('slug' => $slug));
		if (!@file_put_contents($nginxSitesAvailable.'/'.$slug, $cfg, LOCK_EX)) {
			return new JsonResponse(array('error' => 'internal error: failed to create nginx vhost available file'));
		}
		@chmod($nginxSitesAvailable.'/'.$slug, 0777);
		if (!@symlink('../sites-available/'.$slug, $nginxSitesEnabled.'/'.$slug)) {
			return new JsonResponse(array('error' => 'internal error: failed to create nginx vhost enabled symlink'));
		}

		// reload nginx
		@exec('nohup setsid ../rrn.sh > /dev/null 2>&1 &');

		return new JsonResponse(array('id' => $site->getId(), 'slug' => $site->getSlug(), 'domain' => $site->getSlug().'.dev'));
	}

	/**
	 * @Route("/api/site/{id}/index_html")
	 * @Method("GET")
	 */
	public function getSiteIndexHtmlAction($id)
	{
		$em = $this->get('doctrine')->getManager();
		$site = $em->getRepository('MislicSiteBundle:Site')->find(intval($id));
		if (!$site) {
			return new JsonResponse(array('error' => 'site not found'));
		}

		$sitesRoot = $this->container->getParameter('sites_root_path');
		$path = $sitesRoot.'/'.$site->getSlug().'/web/index.html';
		@clearstatcache();
		if (!@file_exists($path)) {
			return new JsonResponse(array('error' => 'internal error: site\'s index.html file is missing'));
		}
		$cont = @file_get_contents($path); 
		if ($cont === false) {
			return new JsonResponse(array('error' => 'internal error: failed to retrieve site\'s index.html contents'));
		}

		// symfony should not interfere with it's debug panel here
		if ($this->container->has('profiler')) {
			$this->container->get('profiler')->disable();
		}

		return new Response($cont);
	}

	/**
	 * @Route("/api/site/{id}/index_html")
	 * @Method("PUT")
	 */
	public function putSiteIndexHtmlAction(Request $req, $id)
	{
		$em = $this->get('doctrine')->getManager();
		$site = $em->getRepository('MislicSiteBundle:Site')->find(intval($id));
		if (!$site) {
			return new JsonResponse(array('error' => 'site not found'));
		}

		$cont = $req->getContent();

		$sitesRoot = $this->container->getParameter('sites_root_path');
		$path = $sitesRoot.'/'.$site->getSlug().'/web/index.html';
		@clearstatcache();
		if (!@file_exists($path)) {
			return new JsonResponse(array('error' => 'internal error: site\'s index.html file is missing'));
		}
		if (!@is_writable($path)) {
			return new JsonResponse(array('error' => 'internal error: site\'s index.html file is not writable'));
		}
		if (!@file_put_contents($path, $cont, LOCK_EX)) {
			return new JsonResponse(array('error' => 'internal error: failed to write site\'s index.html'));
		}
		@chmod($path, 0777);

		return new JsonResponse(array('id' => $site->getId(), 'slug' => $site->getSlug(), 'domain' => $site->getSlug().'.dev'));
	}

	/**
	 * @Route("/api/site/{id}/nginx_vhost")
	 * @Method("GET")
	 */
	public function getSiteNginxVhostAction($id)
	{
		$em = $this->get('doctrine')->getManager();
		$site = $em->getRepository('MislicSiteBundle:Site')->find(intval($id));
		if (!$site) {
			return new JsonResponse(array('error' => 'site not found'));
		}

		$nginxSitesAvailable = $this->container->getParameter('nginx_sites_available_path');
		$path = $nginxSitesAvailable.'/'.$site->getSlug();
		@clearstatcache();
		if (!@file_exists($path)) {
			return new JsonResponse(array('error' => 'internal error: site\'s nginx vhost config file is missing'));
		}
		$cont = @file_get_contents($path); 
		if ($cont === false) {
			return new JsonResponse(array('error' => 'internal error: failed to retrieve site\'s nginx vhost config contents'));
		}

		// symfony should not interfere with it's debug panel here
		if ($this->container->has('profiler')) {
			$this->container->get('profiler')->disable();
		}

		return new Response($cont, 200, array('Content-Type' => 'text/plain; charset=UTF-8'));
	}

	/**
	 * @Route("/api/site/{id}/nginx_vhost")
	 * @Method("PUT")
	 */
	public function putSiteNginxVhostAction(Request $req, $id)
	{
		$em = $this->get('doctrine')->getManager();
		$site = $em->getRepository('MislicSiteBundle:Site')->find(intval($id));
		if (!$site) {
			return new JsonResponse(array('error' => 'site not found'));
		}

		$cont = $req->getContent();

		$nginxSitesAvailable = $this->container->getParameter('nginx_sites_available_path');
		$path = $nginxSitesAvailable.'/'.$site->getSlug();
		@clearstatcache();
		if (!@file_exists($path)) {
			return new JsonResponse(array('error' => 'internal error: site\'s nginx vhost config file is missing'));
		}
		if (!@is_writable($path)) {
			return new JsonResponse(array('error' => 'internal error: site\'s nginx vhost config file is not writable'));
		}
		if (!@file_put_contents($path, $cont, LOCK_EX)) {
			return new JsonResponse(array('error' => 'internal error: failed to write site\'s nginx vhost config'));
		}
		@chmod($path, 0777);

		@exec('nohup setsid ../rrn.sh > /dev/null 2>&1 &');

		return new JsonResponse(array('id' => $site->getId(), 'slug' => $site->getSlug(), 'domain' => $site->getSlug().'.dev'));
	}

	/**
	 * @Route("/api")
	 * @Method("GET")
	 * @Template()
	 */
	public function indexAction()
	{
		return array();
	}
}
