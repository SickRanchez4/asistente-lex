package bo.asistentelex.juridico.adapters.in;

import java.util.Map;
import org.springframework.web.bind.annotation.*;
import bo.asistentelex.juridico.application.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
public class ReportSourcesController {
	private final ReportSourcesService service;
	public ReportSourcesController(CaseService cases, ParticipantService participants, CaseRecordService records) { service=new ReportSourcesService(cases,participants,records); }
	@GetMapping("/cases/{caseId}/report-sources")
	Map<String,Object> sources(@PathVariable String caseId, @RequestParam String audience, @RequestParam(required=false) String type, @RequestParam(required=false) String fromDate, @RequestParam(required=false) String toDate, HttpServletRequest request, HttpServletResponse response) {
		response.setHeader("Cache-Control","no-store");
		return service.sources(AdministrationController.actor(request),caseId,audience,type,fromDate,toDate);
	}
}